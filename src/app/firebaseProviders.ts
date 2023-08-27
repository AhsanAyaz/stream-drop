
import { importProvidersFrom, EnvironmentProviders } from '@angular/core';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';

const firebaseProviders: EnvironmentProviders = importProvidersFrom([
  provideFirebaseApp(() => initializeApp(environment.firebase)),
  provideFirestore(() => getFirestore())
]);

export { firebaseProviders };
