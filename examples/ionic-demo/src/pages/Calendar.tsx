import {
  IonButtons,
  IonButton,
  IonBackButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonDatetime,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonText,
  IonNote,
  IonModal,
  IonTextarea,
  IonToggle,
} from '@ionic/react'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useLiveQuery } from 'electric-sql/react'
import { useElectric, Appointment as AppointmentBase } from '../electric'

type Appointment = AppointmentBase & {
  hasClash?: boolean
}

const Calendar: React.FC = () => {
  const { db } = useElectric()!
  const [date, setDate] = useState<Date>(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment>()
  const [presentingElement, setPresentingElement] =
    useState<HTMLElement | null>(null)
  const page = useRef(null)
  const modal = useRef<HTMLIonModalElement>(null)

  useEffect(() => {
    setPresentingElement(page.current)
  }, [])

  const { results } = useLiveQuery(
    db.appointments.liveMany({
      where: {
        start: {
          // gte beginning of this month
          gte: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
          // lt beginning of next month
          lt: new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            1,
          ).toISOString(),
        },
      },
      orderBy: {
        start: 'asc',
      },
    }),
  )

  const appointments = useMemo(() => {
    if (!results) return []
    const appointments: Appointment[] = []
    results.forEach((appointment) => {
      const appointmentStart = new Date(appointment.start)
      const appointmentEnd = new Date(appointment.end)
      const appointmentId = appointment.id
      const hasClash = results.some((otherAppointment) => {
        const otherAppointmentStart = new Date(otherAppointment.start)
        const otherAppointmentEnd = new Date(otherAppointment.end)
        const otherAppointmentId = otherAppointment.id
        if (appointmentId === otherAppointmentId) return false
        if (
          appointmentStart.getTime() < otherAppointmentEnd.getTime() &&
          appointmentEnd.getTime() > otherAppointmentStart.getTime()
        ) {
          return true
        }
        return false
      })
      appointments.push({ ...appointment, hasClash })
    })
    return appointments
  }, [results])

  const appointmentsDay = useMemo(() => {
    if (!results) return []
    const appointmentsDay: Appointment[] = []
    const dateDay = date.getDate()
    appointments.forEach((appointment) => {
      const appointmentDay = new Date(appointment.start).getDate()
      if (dateDay === appointmentDay) {
        appointmentsDay.push(appointment)
      }
    })
    return appointmentsDay
  }, [date, appointments])

  const dayCounts = useMemo(() => {
    if (!results) return {}
    const dayCounts: { [day: string]: number } = {}
    results.forEach((appointment) => {
      const appointmentDay = new Date(appointment.start).getDate()
      if (dayCounts[appointmentDay]) {
        dayCounts[appointmentDay]++
      } else {
        dayCounts[appointmentDay] = 1
      }
    })
    return dayCounts
  }, [results])

  const onModalDismiss = (ev: any) => {
    setSelectedAppointment(undefined)
  }

  return (
    <IonPage ref={page}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/"></IonBackButton>
          </IonButtons>
          <IonTitle>Your Calendar</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonDatetime
          presentation="date"
          size="cover"
          value={date.toISOString()}
          onIonChange={(e) => setDate(new Date(e.detail.value as string))}
          highlightedDates={(isoString) => {
            const thisDate = new Date(isoString)
            const day = thisDate.getDate()
            const month = thisDate.getMonth()
            const year = thisDate.getFullYear()
            if (month !== date.getMonth() || year !== date.getFullYear()) {
              return
            }
            if (dayCounts[day]) {
              return {
                backgroundColor: '#e7e7ef',
              }
            }
          }}
        ></IonDatetime>

        <IonList>
          {appointmentsDay.map((appointment) => (
            <Row
              key={appointment.id}
              appointment={appointment}
              onClick={() => setSelectedAppointment(appointment)}
            />
          ))}
        </IonList>

        <IonModal
          ref={modal}
          isOpen={!!selectedAppointment}
          onWillDismiss={(ev) => onModalDismiss(ev)}
          presentingElement={presentingElement!}
        >
          {selectedAppointment && (
            <EditForm
              key={selectedAppointment?.id}
              appointment={selectedAppointment!}
              modal={modal}
            />
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  )
}

const Row = ({
  appointment,
  onClick,
}: {
  appointment: Appointment
  onClick: () => void
}) => {
  return (
    <IonItem
      button={true}
      detail={false}
      style={{
        opacity: appointment.cancelled ? 0.5 : 1,
      }}
      onClick={onClick}
    >
      <div slot="start">
        <IonNote color={appointment.hasClash ? 'danger' : 'medium'}>
          {new Date(appointment.start).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          <br />
          {new Date(appointment.end).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </IonNote>
      </div>
      <IonLabel>
        {appointment.cancelled && <IonText color="danger">Cancelled: </IonText>}
        <strong>{appointment.name}</strong>{' '}
        <IonText>{appointment.email}</IonText>
        <br />
        <IonNote color="medium" className="ion-text-wrap">
          {appointment.comments || '-'}
        </IonNote>
      </IonLabel>
    </IonItem>
  )
}

const EditForm = ({
  appointment,
  modal,
}: {
  appointment: Appointment
  modal: React.MutableRefObject<HTMLIonModalElement | null>
}) => {
  const { db } = useElectric()!
  const [name, setName] = useState<string>(appointment.name)
  const [email, setEmail] = useState<string>(appointment.email)
  const [phone, setPhone] = useState<string>(appointment.phone)
  const [address, setAddress] = useState<string>(appointment.address)
  const [comments, setComments] = useState<string>(appointment.comments)
  const [cancelled, setCancelled] = useState<boolean>(!!appointment.cancelled)

  const start = useMemo(() => new Date(appointment.start), [appointment.start])
  const end = useMemo(() => new Date(appointment.end), [appointment.end])

  const handleConfirm = async () => {
    db.appointments.update({
      where: {
        id: appointment.id,
      },
      data: {
        name,
        email,
        phone,
        address,
        comments,
        cancelled: cancelled ? 1 : 0,
      },
    })
    modal.current?.dismiss()
  }

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => modal.current?.dismiss()}>
              Cancel
            </IonButton>
          </IonButtons>
          <IonTitle>Edit Appointment</IonTitle>
          <IonButtons slot="end">
            <IonButton strong={true} onClick={handleConfirm}>
              Confirm
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent color="light">
        <IonList inset={true}>
          <IonItem>
            <IonInput
              label="Appointment Time"
              label-placement="floating"
              value={`${start.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}, ${start.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })} to ${end.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`}
              readonly={true}
            ></IonInput>
          </IonItem>
        </IonList>

        <IonList inset={true}>
          <IonItem>
            <IonInput
              label="Name"
              label-placement="floating"
              onIonInput={(e) => setName(e.detail.value!)}
              value={name}
            ></IonInput>
          </IonItem>
          <IonItem>
            <IonInput
              label="Email"
              label-placement="floating"
              type="email"
              onIonInput={(e) => setEmail(e.detail.value!)}
              value={email}
            ></IonInput>
          </IonItem>
          <IonItem>
            <IonInput
              label="Phone"
              label-placement="floating"
              type="tel"
              onIonInput={(e) => setPhone(e.detail.value!)}
              value={phone}
            ></IonInput>
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Address"
              label-placement="floating"
              rows={3}
              onIonInput={(e) => setAddress(e.detail.value!)}
              value={address}
            ></IonTextarea>
          </IonItem>
        </IonList>

        <IonList inset={true}>
          <IonItem>
            <IonTextarea
              label="Comments"
              label-placement="floating"
              rows={5}
              onIonInput={(e) => setComments(e.detail.value!)}
              value={comments}
            ></IonTextarea>
          </IonItem>
        </IonList>

        <IonList inset={true}>
          <IonItem>
            <IonToggle
              checked={cancelled}
              onIonChange={(e) => setCancelled(e.detail.checked)}
              color="danger"
            >
              Cancelled
            </IonToggle>
          </IonItem>
        </IonList>
      </IonContent>
    </>
  )
}

export default Calendar
