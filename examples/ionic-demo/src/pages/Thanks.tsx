import {
  IonButton,
  IonButtons,
  IonBackButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'

const Thanks: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/"></IonBackButton>
          </IonButtons>
          <IonTitle>Thankyou</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent color="light" className="ion-padding">
        <h1 className="ion-padding ion-text-center">
          Thankyou for booking an appointment with us.
        </h1>
        <IonButton routerLink="/" expand="block">
          Back to Home
        </IonButton>
      </IonContent>
    </IonPage>
  )
}

export default Thanks
