import 'dotenv/config';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const props = await db.collection('properties').find({}, { projection: { title: 1, photos: 1 } }).limit(5).toArray();
props.forEach(p => console.log(p.title, '->', p.photos?.slice(0, 3)));

const users = await db.collection('users').find({ avatar: { $exists: true, $ne: '' } }, { projection: { email: 1, avatar: 1 } }).limit(3).toArray();
users.forEach(u => console.log(u.email, 'avatar:', u.avatar));

const agents = await db.collection('agents').find({}, { projection: { name: 1, photo: 1 } }).limit(3).toArray();
agents.forEach(a => console.log(a.name, 'photo:', a.photo));

const totalProps = await db.collection('properties').countDocuments();
console.log('\nTotal properties:', totalProps);

await mongoose.disconnect();
