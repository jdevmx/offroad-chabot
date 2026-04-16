import 'dotenv/config';
import { getFirestore } from './infrastructure/firebase/firebaseAdmin';
import { createApp } from './presentation/app';

const PORT = process.env.PORT ?? 3001;

const app = createApp(getFirestore());

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
