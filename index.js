const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
}


//middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

//verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if(!token) return res.status(401).send({message: 'unauthorized access'})

  if(token){
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{

      if(err){
        console.log(err);
        return res.status(401).send({message: 'unauthorized access'})
      }
      console.log(decoded);
      req.user = decoded
      next()
    })
  }
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhiqbma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      //await client.connect();

      const jobsCollection = client.db('SoloSphere').collection('jobs');
      const bidsCollection = client.db('SoloSphere').collection('bids');


      //jwt generate
      app.post('/jwt', async(req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1hr'
        });
        res.cookie('token', token,{
          httpOnly: true,
          secure: process.env.NODE_ENV==='production',
          sameSite: process.env.NODE_ENV==='production'?'none':'strict',
        }).send({success: true});
      });

      //Clear token on logout
      app.get('/logout', async(req, res) => {
        res.clearCookie('token',{
          httpOnly: true,
          secure: process.env.NODE_ENV==='production',
          sameSite: process.env.NODE_ENV==='production'?'none':'strict',
          maxAge:0,
        }).send({success: true});
      })

    
      //Get all jobs data from db

      app.get('/jobs', async(req, res) => {
        const result = await jobsCollection.find().toArray();
        res.send(result)
      })

      //Get a single job data from db using job id
      app.get('/job/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await jobsCollection.findOne(query);
        res.send(result);
      })


      //Save a job data in db
      app.post('/job', async(req, res) =>{
        const jobData = req.body;
        const result = await jobsCollection.insertOne(jobData);
        res.send(result);
      })

      //Save all jobs posted by a specific user
      app.get('/jobs/:email', verifyToken, async(req, res)=>{
        const tokenData = req.user;
        console.log(tokenData, 'from token');
        const email = req.params.email;
        const query = {'buyer.email': email};
        const result = await jobsCollection.find(query).toArray();
        res.send(result);
      })

      //delete a job data from db
      app.delete('/job/:id', verifyToken, async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await jobsCollection.deleteOne(query);
        res.send(result);
      })

      //update a job in db
      app.put('/job/:id', async(req, res) => {
        const id = req.params.id;
        const jobData = req.body;
        const query = {_id: new ObjectId(id)}
        const options = {upsert: true}
        const updateDoc = {
          $set:{
            ...jobData,
          }
        }
        const result = await jobsCollection.updateOne(query, updateDoc, options);
        res.send(result);
      });

      //Save a bid data in db
      app.post('/bid', async(req, res) =>{
        const bidData = req.body;
        const result = await bidsCollection.insertOne(bidData);
        res.send(result);
      })

      //get all bids for a user by email from db
      app.get('/my-bids/:email', async(req, res) =>{
        const email = req.params.email;
        const query = {email};
        const result = await bidsCollection.find(query).toArray();
        res.send(result)
      });

      //Get all bid requests from db for job owner
      app.get('/bid-requests/:email', async(req, res) => {
        const email = req.params.email;
        const query = {'buyer.email': email}
        const result = await bidsCollection.find(query).toArray();
        res.send(result);
      });

      //Update Bid Status
      app.patch('/bid/:id', async(req, res) => {
        const id = req.params.id;
        const status = req.body;
        const query = {_id: new ObjectId(id)};
        const updateDoc={
          $set:status,
        }
        const result = await bidsCollection.updateOne(query, updateDoc)
        res.send(result);
      });



      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      //await client.close();
    }
  }
  run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello from SoloSphere Server...')
})

app.listen(port, ()=> console.log(`Server running on port: ${port}`));