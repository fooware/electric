defmodule Electric.Postgres.Proxy.Handler do
  use ThousandIsland.Handler

  alias ThousandIsland.Socket
  alias Electric.Postgres.Extension.{SchemaCache, SchemaLoader}
  alias Electric.Replication.Connectors
  alias PgProtocol.Message, as: M

  alias Electric.Postgres.Proxy.{
    Injector,
    UpstreamConnection
  }

  import __MODULE__.Tracing

  require Logger

  @type option() :: {:loader, {module(), Keyword.t()}}
  @type options() :: [option()]

  defmodule S do
    defstruct upstream: [],
              injector_opts: [],
              injector: nil,
              loader: nil,
              conn_config: nil,
              connection: nil,
              decoder: nil,
              session_id: nil,
              authenticated?: false,
              authentication: nil

    @type username() :: String.t()
    @type salt() :: binary()
    @type auth_type() :: {:md5, username(), salt()}

    @type t() :: %__MODULE__{
            upstream: [PgProtocol.Message.t()],
            injector: nil | Injector.t(),
            injector_opts: Keyword.t(),
            loader: SchemaLoader.t(),
            conn_config: Connectors.config(),
            connection: nil | pid(),
            decoder: PgProtocol.Decoder.t(),
            session_id: nil | integer(),
            authenticated?: boolean(),
            authentication: nil | auth_type()
          }
  end

  @spec initial_state(Electric.Replication.Connectors.config(), options()) :: S.t()
  def initial_state(conn_config, proxy_opts) do
    {loader_module, loader_opts} = Keyword.get(proxy_opts, :loader, {SchemaCache, []})

    %S{
      conn_config: conn_config,
      loader: {loader_module, loader_opts},
      decoder: PgProtocol.Decoder.frontend(),
      injector_opts: Keyword.get(proxy_opts, :injector, [])
    }
  end

  @impl ThousandIsland.Handler
  def handle_connection(_socket, state) do
    %{loader: {loader_module, loader_opts}, conn_config: conn_config} = state

    {:ok, loader_conn} = loader_module.connect(conn_config, loader_opts)

    {:ok, injector} =
      Keyword.merge(state.injector_opts, loader: {loader_module, loader_conn})
      |> Injector.new()

    session_id = Electric.Postgres.Proxy.session_id()
    Logger.metadata(session_id: session_id)

    {:continue, %{state | session_id: session_id, injector: injector}}
  end

  @impl ThousandIsland.Handler
  def handle_data(data, socket, state) do
    {:ok, decoder, msgs} = PgProtocol.decode(state.decoder, data)

    trace_recv(:client, msgs)

    Logger.debug("Frontend msgs: #{M.inspect(msgs)}")

    handle_messages(msgs, socket, %{state | decoder: decoder})
  end

  @impl GenServer
  def handle_info({:downstream, :msgs, msgs}, {socket, state}) do
    trace_recv(:server, msgs)

    {:ok, injector, upstream_msgs, downstream_msgs} =
      Injector.recv_backend(state.injector, msgs)

    :ok = upstream(upstream_msgs, state)
    :ok = downstream(downstream_msgs, socket)
    {:noreply, {socket, %{state | injector: injector}}}
  end

  def handle_info({UpstreamConnection, :authenticated}, {socket, state}) do
    Logger.info("Upstream connection is ready to accept queries")
    {:noreply, {socket, state}}
  end

  defp handle_messages(msgs, socket, state) do
    Enum.reduce(msgs, {:continue, state}, fn msg, {return, state} ->
      handle_message(msg, return, socket, state)
    end)
  end

  defp handle_message(%M.SSLRequest{}, return, socket, state) do
    downstream("N", socket)
    {return, state}
  end

  defp handle_message(%M.StartupMessage{} = msg, return, socket, state) do
    state =
      case msg.params do
        %{"user" => user, "password" => _password} ->
          Logger.warning("Not validating credentials #{inspect(user)}:<password>")
          authenticated(socket, state)

        %{"user" => user} ->
          Logger.warning("Not validating user #{inspect(user)}")
          salt = M.AuthenticationMD5Password.salt()
          msg = M.AuthenticationMD5Password.new(salt: salt)
          # downstream([%M.AuthenticationCleartextPassword{}], socket)
          downstream([msg], socket)
          %{state | authentication: {:md5, user, salt}}
      end

    {return, state}
  end

  defp handle_message(%M.GSSResponse{} = msg, return, socket, state) do
    case state.authentication do
      nil ->
        Logger.warning("Not validating authentication response #{inspect(msg)}")
        state = authenticated(socket, state)
        {return, state}

      {:md5, username, salt} ->
        <<"md5", hash::binary-32, 0>> = msg.data
        # FIXME: we need some kind of authentication configuration
        #        for the moment accept a bunch of passwords for quick dev
        passwords = ["p", "pass", "password"]

        if Enum.any?(passwords, &md5_auth_valid?(&1, username, salt, hash)) do
          state = authenticated(socket, state)
          {return, state}
        else
          # This response is wrong somehow -- psql doesn't respond in the way 
          # it does when you enter the wrong password against a real db
          # Docs say that options are the various auth messages or an ErrorResponse
          # so maybe it's something about my ErrorResponse that's wrong?
          Logger.warning("Password authentication for user '#{username}' failed")

          :ok =
            downstream(
              [
                %M.ErrorResponse{
                  severity: "FATAL",
                  message: "Password authentication failed for user \"#{username}\"",
                  # copied from psql `libpq/auth.c`
                  code: "28P01"
                }
              ],
              socket
            )

          {return, state}
        end
    end
  end

  defp handle_message(%M.Terminate{}, _return, _socket, state) do
    {:close, state}
  end

  defp handle_message(msg, return, socket, state) do
    {:ok, injector, upstream_msgs, downstream_msgs} =
      Injector.recv_frontend(state.injector, msg)

    :ok = upstream(upstream_msgs, state)
    :ok = downstream(downstream_msgs, socket)

    {return, %{state | injector: injector}}
  end

  defp md5_auth_valid?(password, username, salt, hash) do
    expected =
      password
      |> md5(username)
      |> md5(salt)

    expected == hash
  end

  defp md5(binary1, binary2) do
    Base.encode16(:crypto.hash(:md5, binary1 <> binary2), case: :lower)
  end

  defp authenticated(socket, state) do
    :ok = downstream([%M.AuthenticationOk{}], socket)
    Logger.debug("Starting upstream connection: #{inspect(state.upstream)}")

    {:ok, pid} =
      UpstreamConnection.start_link(
        parent: self(),
        session_id: state.session_id,
        conn_config: state.conn_config
      )

    %{state | connection: pid, authenticated?: true}
  end

  defp downstream(msgs, socket) do
    trace_send(:client, msgs)
    Socket.send(socket, PgProtocol.encode(msgs))
  end

  defp upstream(msgs, state) do
    trace_send(:server, msgs)
    GenServer.cast(state.connection, {:upstream, msgs})
  end
end
