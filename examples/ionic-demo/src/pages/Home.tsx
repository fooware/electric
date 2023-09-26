import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonIcon,
} from '@ionic/react'
import { addOutline, calendarOutline } from 'ionicons/icons'
import './Home.css'
import Logo from '../assets/logo.svg'

const Home: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <img src={Logo} alt="ElectricSQL" className="logo" />
            Appointments
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <h1 className="ion-text-center">
          <img src={Logo} alt="ElectricSQL" className="" />
        </h1>
        <p className="ion-text-center">Welcome to Electric Appointments!</p>
        <p className="ion-text-center ion-padding-bottom">
          This is a simple demo app built with{' '}
          <a href="http://ionicframework.com">Ionic</a> and{' '}
          <a href="http://electric-sql.com">ElectricSQL</a> that allows you to
          schedule an&nbsp;appointment.
        </p>
        <IonButton
          routerLink="/new"
          expand="block"
          className="ion-margin-vertical"
        >
          <IonIcon slot="start" icon={addOutline} />
          Schedule Appointment
        </IonButton>
        <IonButton routerLink="/calendar" expand="block" color="light">
          <IonIcon slot="start" icon={calendarOutline} />
          Your Calendar
        </IonButton>
      </IonContent>
    </IonPage>
  )
}

export default Home
