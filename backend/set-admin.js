import mongoose from 'mongoose';

async function setAdmin() {
  await mongoose.connect('mongodb://127.0.0.1:27017/vrgeorgia');
  
  // Find all users first
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('All users:', users.map(u => ({ email: u.email, role: u.role })));
  
  // Set first user as admin
  if (users.length > 0) {
    const result = await mongoose.connection.db.collection('users').updateOne(
      { _id: users[0]._id },
      { $set: { role: 'admin' } }
    );
    console.log('Updated user', users[0].email, 'to admin:', result.modifiedCount);
  }
  
  process.exit(0);
}

setAdmin().catch(console.error);
