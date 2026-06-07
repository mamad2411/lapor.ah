import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({
  credential: cert({
    projectId: 'laporah-6a4a9',
    clientEmail: 'firebase-adminsdk-fbsvc@laporah-6a4a9.iam.gserviceaccount.com',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth();
const email = 'superadmin@desa.go.id';
const newPassword = 'chaali_MwD0324';

const user = await auth.getUserByEmail(email);
await auth.updateUser(user.uid, { password: newPassword });
console.log(`Password for ${email} reset successfully.`);
