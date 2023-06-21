const { createServer, request } = require('http')
const { spawn } = require('child_process')

const fs = require('fs-extra')
const path = require('path')

const { build, serve } = require('esbuild')

const cssModulesPlugin = require('esbuild-css-modules-plugin')
// const inlineImage = require('esbuild-plugin-inline-image')
const {svgrPlugin} = require('esbuild-svgr-plugin')
const postCssPlugin = require('esbuild-style-plugin')

const shouldMinify = process.env.NODE_ENV === 'production'
const shouldServe = process.env.SERVE === 'true'


// https://github.com/evanw/esbuild/issues/802#issuecomment-819578182
const liveServer = (buildOpts) => {
  const clients = []

  build(
    {
      ...buildOpts,
      banner: { js: ' (() => new EventSource("/esbuild").onmessage = () => location.reload())();' },
      watch: {
        onRebuild(error, result) {
          clients.forEach((res) => res.write('data: update\n\n'))
          clients.length = 0
          console.log(error ? error : '...')
        },
      }
    }
  ).catch(() => process.exit(1))

  serve({servedir: 'dist' }, {})
    .then(() => {
      createServer((req, res) => {
        const { url, method, headers } = req

        if (url === '/esbuild')
          return clients.push(
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            })
          )

        const path = ~url.split('/').pop().indexOf('.') ? url : `/index.html` //for PWA with router
        req.pipe(
          request({ hostname: '0.0.0.0', port: 8000, path, method, headers }, (prxRes) => {
            res.writeHead(prxRes.statusCode, prxRes.headers)
            prxRes.pipe(res, { end: true })
          }),
          { end: true }
        )
      }).listen(4002)

    setTimeout(() => {
      const op = { darwin: ['open', '-a', 'Google\ Chrome'], linux: ['xdg-open'], win32: ['cmd', '/c', 'start'] }
      const ptf = process.platform
      if (clients.length === 0) spawn(op[ptf][0], [...[op[ptf].slice(1)], `http://localhost:4002`])
    }, 500) // open the default browser only if it is not opened yet
  })
}

/**
 * ESBuild Params
 * @link https://esbuild.github.io/api/#build-api
 */
let buildParams = {
  color: true,
  entryPoints: ["src/index.tsx"],
  loader: { ".ts": "tsx", ".woff": "file", ".woff2": "file"},
  outdir: "dist",
  minify: false,
  format: "cjs",
  bundle: true,
  sourcemap: true,
  logLevel: "error",
  incremental: true,
  external: ["fs", "path"],
  plugins: [
      postCssPlugin({
        postcss: {
          plugins: [require('tailwindcss'), require('autoprefixer')],
        },
      }),
    //inlineImage(),
    svgrPlugin({
            /**
             * A regular expression that indicates which assets
             * should be converted to a React component
             */
            filter: /\.(svg|xml)$/,
            /**
             * A regular expression that controls on which
             * files the imports should be transformed
             */
            issuer: /\.(js|tsx)/,
        }),
  ]
};

(async () => {
  fs.removeSync("dist");
  fs.copySync("public", "dist");

  if (shouldServe) {
    liveServer(buildParams)
  }
  else {
    await build(buildParams)

    process.exit(0)
  }
})();
