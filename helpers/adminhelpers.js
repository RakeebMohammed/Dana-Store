var db=require('../config/connection')
var collections=require('../config/collections')
const bcrypt=require('bcrypt') 
var objectid = require('objectid')


module.exports={
    getAllorders:()=>{
        return new Promise(async(resolve, reject) => {
            let allorder=await db.get().collection(collections.ORDER_COLLECTION).find().toArray()
          //  console.log(allorder);
          resolve(allorder) 
            })
            
        },
       changeUserorder:(details)=>{
       
            return new Promise((resolve, reject) => {
                db.get().collection(collections.ORDER_COLLECTION).updateOne({_id:objectid(details.orderId)},{$set:{PaymentStatus:details.change}}).then(result=>{
                    console.log(result);
                    resolve()
                })
              
            })
        },
        getOrderProducts: (userId) => {
            return new Promise(async (resolve, reject) => {
              let orders = await db
                .get()
                .collection(collections.ORDER_COLLECTION)
                .find({ _id: objectid(userId) })
                .toArray();
              if (orders) {
                let cart = await db
                  .get()
                  .collection(collections.ORDER_COLLECTION)
                  .aggregate([
                    { $match: { _id: objectid(userId) } },
                    { $unwind: "$Products" },
                    {
                      $project: {
                        item: "$Products.item",
                        quantity: "$Products.quantity",
                        PaymentMethod: 1,
                        PaymentStatus: 1,
                        Date: 1,
                        OrderedDate: 1,
                        UserId: 1,
                        Amount:1
                      },
                    },
                    {
                      $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: "item",
                        foreignField: "_id",
                        as: "orderproducts",
                      },
                    },
                    {
                      $project: {
                        quantity: 1,
                        orderproducts: { $arrayElemAt: ["$orderproducts", 0] },
                        PaymentMethod: 1,
                       PaymentStatus: 1,
                        OrderedDate: 1,
                        UserId: 1,
                        Amount:1
                      },
                    },
                  ])
                  .toArray();
                console.log(cart);
                resolve(cart);
              } else {
                reject();
              }
            });
          },
          totalSale:()=>{
            return new Promise(async(resolve, reject) => {
              let total =await db.get().collection(collections.ORDER_COLLECTION).aggregate([
               // {$match:{PaymentStatus:'Placed'}},
                {$group:{_id:{},totalSale:{$sum:"$Amount"}}}]).toArray()
              console.log(total);
           resolve(total[0].totalSale)
            })
         
          },
          totalOrders:()=>{
            return new Promise(async(resolve, reject) => {
              let total =await db.get().collection(collections.ORDER_COLLECTION).count()
              console.log(total);
           resolve(total)
            })
          },
          totalCustomers:()=>{
            return new Promise(async(resolve, reject) => {
              let total =await db.get().collection(collections.USER_COLLECTION).count()
              console.log(total);
           resolve(total)
            })
          },
          allStatus:()=>{
            return new Promise(async(resolve, reject) => {
              let status={}
              let pending=await db.get().collection(collections.ORDER_COLLECTION).aggregate([{$match:{PaymentStatus:'Pending'}},{$group:{_id:{},pending:{$sum:1}}}]).toArray()
              let placed=await db.get().collection(collections.ORDER_COLLECTION).aggregate([{$match:{PaymentStatus:'Placed'}},{$group:{_id:{},placed:{$sum:1}}}]).toArray()
              let cancelled=await db.get().collection(collections.ORDER_COLLECTION).aggregate([{$match:{PaymentStatus:'Cancelled'}},{$group:{_id:{},cancelled:{$sum:1}}}]).toArray()
              let shipped=await db.get().collection(collections.ORDER_COLLECTION).aggregate([{$match:{PaymentStatus:'Shipped'}},{$group:{_id:{},shipped:{$sum:1}}}]).toArray()
              let delivered=await db.get().collection(collections.ORDER_COLLECTION).aggregate([{$match:{PaymentStatus:'Delivered'}},{$group:{_id:{},delivered:{$sum:1}}}]).toArray()
             
              console.log(pending[0],placed[0],cancelled[0],delivered[0],shipped[0]);
            status.pending=pending[0]
            status.delivered=delivered[0]
            status.cancelled=cancelled[0]
            status.placed=placed[0]
          status.shipped=shipped[0]
            resolve(status)
          })
          },
          monthlySale:()=>{
           
              return new Promise(async(resolve,reject)=>{
                  let monthSale= await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                    //    {
                    //        $match:{
                    //          PaymentStatus:"Placed"
                    //        }
                    //  },   
                      {
                          $group: {
                              _id: {month:{ $month:{ $toDate: "$OrderedDate" }}} ,totalSale:{$sum:'$Amount'}  
                          }    
                      },
                      {
                          $sort:{"_id.month": -1}
                      },
                      {
                          $project:{
                              _id:0,
                              totalSale:1
                          }
                      }      
                  ]).toArray()
                  console.log(monthSale[0].totalSale);
      resolve(monthSale[0].totalSale)
                })},
                getMonths:()=>{
                  return new Promise(async(resolve,reject)=>{
                      let months= await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                          {
                              $group: {
                                  _id: {month:{ $month:{ $toDate: "$OrderedDate" }}} ,totalSale:{$sum:'$Amount'}  
                              }    
                          },
                          {
                              $sort:{"_id.month": -1}
                          },
                          {
                              $limit:6
                          },
                         // orginal
                          {
                              $project:{
                                  _id:0,month:'$_id.month',
                                  //_id:0,month:{$reverseArray:'$_id.month'},
                                  totalSale:1,
                                  //monthii:{$reverseArray:'$_id.month'}
                              }
                          }
                        ]).toArray()
                        months.forEach(element => {
                            // monNumArray.push(element.month)
                            //element.month="hai"
            
                            function toMonthName(months) {
                                const date = new Date();
                                date.setMonth(months - 1);
                              
                                return date.toLocaleString('en-US', {
                                  month: 'long',
                                });
                            }
                            element.month=toMonthName(element.month)
                        }); 
                        console.log('m');
                        console.log(months);
                        resolve(months)  
                    })
                },
                getYears:()=>{
                  return new Promise(async(resolve,reject)=>{
                      let years=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                       
                        {
                              $group:{
                                  _id: {year:{ $year :{ $toDate: "$OrderedDate" }}} ,totalSaleYear:{$sum:'$Amount'} 
                              }
                          },
                          {
                              $sort:{"_id.year": -1}
                          },
                          {
                              $limit:6
                          },
                          {
                              $project:{
                                  _id:0,year:'$_id.year',
                                  totalSaleYear:1,
                              }
                          }
                      ]).toArray()
                      console.log(years)
                      resolve(years)
                  })
              },
              getDays:()=>{
                return new Promise(async(resolve,reject)=>{
                    let days=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                        {
                            $group:{
                                _id: {day:{ $dayOfMonth :{ $toDate: "$OrderedDate" }}} ,totalSaleDay:{$sum:'$Amount'} 
                            }
                        },
                        {
                            $sort:{"_id.day": -1}       
                        },
                        {
                            $limit:5
                        },
                        {
                            $project:{
                                _id:0,day:'$_id.day',
                                totalSaleDay:1,
                            }
                        }
                    ]).toArray()
                    console.log('days');
                    console.log(days);
                    resolve(days)
        })
         },
         addCoupon:(details)=>{
          return new Promise((resolve, reject) => {
            details.offer=parseInt(details.offer)
            details.min=parseInt(details.min)
           
            details.max=parseInt(details.max)
           
            db.get().collection(collections.COUPON_COLLECTION).insertOne(details).then((result)=>{
              resolve()
            })
          })
         },
         addOffer:(details)=>{
          return new Promise((resolve, reject) => {
            details.coffer=parseInt(details.coffer)
           
           
            db.get().collection(collections.OFFER_COLLECTION).insertOne(details).then((result)=>{
              resolve(result.insertedId)
            })
          })
        },
        deleteCoupon:(id=>{
          return new Promise((resolve, reject) => {
            db.get().collection(collections.COUPON_COLLECTION).deleteOne({_id:objectid(id)}).then(result=>{
              console.log(result);
              resolve()
            })
          })
        })
,
deleteOffer:(details=>{
  console.log(details);
  return new Promise(async(resolve, reject) => {
    let product = await db
    .get()
    .collection(collections.OFFER_COLLECTION)
    .findOne({ _id: objectid(details.id) });
    db.get()
    .collection(collections.PRODUCT_COLLECTION)
    .updateMany({ category: details.category }, [
      {
        $set: {
          price: {
            $add: [
              "$price",
              { $multiply: ["$MRP", { $divide: [product.coffer, 100] }] },
            ],
          },
        },
      },
    ]).then(result=>{
        console.log(result);
        resolve()
    });
    db.get().collection(collections.OFFER_COLLECTION).deleteOne({_id:objectid(details.id)}).then(result=>{
      console.log(result);
      resolve()
    })
  })

})  ,
getBanner:()=>{
  return new Promise(async(resolve, reject) => {
    let banner=await db.get().collection(collections.BANNER_COLLECTION).find().toArray()
    
      resolve(banner)
      console.log(banner);
   
 
   
  })
}  ,
addBanner:(details)=>{
  return new Promise((resolve, reject) => {
    db.get().collection(collections.BANNER_COLLECTION).insertOne(details).then(result=>{
      resolve(result.insertedId)
    })
  })

} ,
deleteBanner:(id=>{
  return new Promise((resolve, reject) => {
    db.get().collection(collections.BANNER_COLLECTION).deleteOne({_id:objectid(id)}).then(()=>{
      resolve()
    }).catch(()=>{
      reject()
    })
  })
})                         
          
              }
