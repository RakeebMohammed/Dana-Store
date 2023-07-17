var mongoClient=require('mongodb').MongoClient
const state={db:null}


module.exports.connect=((done)=>{
  
    require('dotenv').config()   
const url=process.env.DATABASE

const dbname="danastore"
mongoClient.connect(url,(err,data)=>{
    if(err){
        console.log(err,'err')
        return done(err)
    } 
    state.db=data.db(dbname)
   
    done()
})
} )

module.exports.get=(()=>state.db)