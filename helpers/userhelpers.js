var db = require("../config/connection");
var collections = require("../config/collections");
const bcrypt = require("bcrypt");
var objectid = require("objectid");
const moment = require("moment");
const Razorpay = require("razorpay");
var paypal = require("paypal-rest-sdk");
require("dotenv").config();
paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id: process.env.PAYPAL_KEY, // please provide your client id here
  client_secret: process.env.PAYPAL_SECRET, // provide your client secret here
});

require("dotenv").config();
var instance = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      emailexists = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ email: userData.email });
      phoneexists = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ phone_number: userData.number });
      console.log(phoneexists);

      if (emailexists) {
        reject("Email already exists...!");
      } else if (phoneexists) {
        reject("Phone number already exists...!");
      } else {
        userData.password = await bcrypt.hash(userData.password, 10);
        db.get().collection(collections.USER_COLLECTION).insertOne({
          username: userData.username,
          email: userData.email,
          phone_number: userData.number,
          password: userData.password,
        });
        resolve();
      }
    });
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ email: userData.email });
      //  console.log(user);
      let response = {};
      let loginStatus = false;
      if (user) {
        bcrypt.compare(userData.password, user.password).then((result) => {
          if (result) {
            console.log("email and password verification -success");
            response.user = user;
            console.log(response.user);
            response.result = true;
            resolve(response);
          } else {
            console.log("failed");
            reject("Password is incorrect");
          }
        });
      } else {
        reject("Email is incorrect");
      }
    });
  },

  isBlocked: (userId) => {
    return new Promise(async (resolve, reject) => {
      let Blocked = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({
          $and: [{ _id: objectid(userId) }, { isBlocked: { $eq: true } }],
        });

      if (Blocked) {
        let error = "User is blocked due to some reasons...!";
        reject(error);
        console.log("blocked");
      } else {
        resolve();
      }
    });
  },
  adminLogin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let admin = await db
        .get()
        .collection(collections.ADMIN_COLLECTION)
        .findOne({ email: adminData.email });
      if (admin) {
        bcrypt.compare(adminData.password, admin.password).then((result) => {
          if (result) {
            console.log("success");
            resolve(admin);
          } else {
            console.log("failed");
            reject();
          }
        });
      } else {
        console.log("failed");
        reject();
      }
    });
  },
  allUsers: () => {
    return new Promise(async (resolve, reject) => {
      let allusers = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .find()
        .toArray();

      resolve(allusers);
    });
  },
  blockUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne({ _id: objectid(userId) }, { $set: { isBlocked: true } });
      resolve();
    });
  },
  unblockUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne({ _id: objectid(userId) }, { $set: { isBlocked: false } });
      resolve();
    });
  },
  addtoCart: (productId, userId) => {
    let user_cart = {
      item: objectid(productId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let arr = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .updateOne({ _id: objectid(userId) }, { $addToSet: { user_cart } });
      let count = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .aggregate([
          { $match: { _id: objectid(userId) } },
          { $project: { user_cart: 1 } },
        ])
        .toArray();
      console.log(count[0].user_cart.length);
      console.log(count);
      resolve(count[0].user_cart.length);
    });
  },
  getCart: (userId) => {
    return new Promise(async (resolve, reject) => {
      let isCart = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ _id: objectid(userId) }, { "user_cart.item": 1 });
      // length=isCart.user_cart.length
      //   console.log(length);
      if (!isCart.user_cart) {
        reject();
      } else {
        if (isCart.user_cart.length == 0) {
          reject();
        } else {
          let cart = await db
            .get()
            .collection(collections.USER_COLLECTION)
            .aggregate([
              { $match: { _id: objectid(userId) } },
              { $unwind: "$user_cart" },
              {
                $project: {
                  item: "$user_cart.item",
                  quantity: "$user_cart.quantity",
                },
              },
              {
                $lookup: {
                  from: collections.PRODUCT_COLLECTION,
                  localField: "item",
                  foreignField: "_id",
                  as: "products",
                },
              },
              {
                $project: {
                  item: 1,
                  quantity: 1,
                  products: { $arrayElemAt: ["$products", 0] },
                },
              },
            ])
            .toArray();
          console.log(cart);
          resolve(cart);
        }
      }
    });
  },

  getcartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartcount = null;
      let userExists = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ _id: objectid(userId) }, { user_cart: 1 });
      console.log(userExists);
      if (userExists.user_cart) {
        cartcount = userExists.user_cart.length;
        // console.log(cartcount)
        resolve(cartcount);
      } else {
        cartcount = 0;
        resolve(cartcount);
      }
    });
  },
  changeQuantity: (details) => {
    details.count = parseInt(details.count);
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne(
          { "user_cart.item": objectid(details.productId) },
          {
            $inc: {
              "user_cart.$.quantity": details.count,
            },
          }
        )
        .then((result) => {
          // console.log(result);
          console.log("mutheee");
        });

      // console.log(count[0].quantity);
      resolve({ status: true });
    });
  },
  deleteItem: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne(
          { _id: objectid(details.user) },
          { $pull: { user_cart: { item: objectid(details.product) } } }
        )
        .then((result) => {
          console.log(result);
        });
      resolve();
    });
  },
  totalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let isCart = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ _id: objectid(userId) }, { "user_cart.item": 1 });
      // length=isCart.user_cart.length
      //   console.log(length);
      if (!isCart.user_cart) {
        totalAmount = 0;
        resolve(totalAmount);
      } else {
        let totalamount = await db
          .get()
          .collection(collections.USER_COLLECTION)
          .aggregate([
            { $match: { _id: objectid(userId) } },
            { $unwind: "$user_cart" },
            {
              $project: {
                item: "$user_cart.item",
                quantity: "$user_cart.quantity",
              },
            },
            {
              $lookup: {
                from: collections.PRODUCT_COLLECTION,
                localField: "item",
                foreignField: "_id",
                as: "products",
              },
            },
            {
              $project: {
                item: 1,
                quantity: 1,
                products: { $arrayElemAt: ["$products", 0] },
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: { $multiply: ["$quantity", "$products.price"] },
                },
              },
            },
          ])
          .toArray();
        // if(totalamount[0].total){
        resolve(totalamount[0].total);
        // }
        console.log(totalamount[0].total);
        // else{
        // reject()
        // }
      }
    });
  },
  individualTotal: (userId) => {
    return new Promise(async (resolve, reject) => {
      console.log(userId);
      let totalamount = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .aggregate([
          { $match: { _id: objectid(userId) } },
          { $unwind: "$user_cart" },
          {
            $project: {
              item: "$user_cart.item",
              quantity: "$user_cart.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "products",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              products: { $arrayElemAt: ["$products", 0] },
            },
          },
          {
            $project: {
              _id: null,
              item: 1,
              quantity: 1,
              price: "$products.price",
              name: "$products.name",
              subtotal: {
                $sum: { $multiply: ["$quantity", "$products.price"] },
              },
            },
          },
        ])
        .toArray();
      console.log(totalamount);
      resolve(totalamount);
    });
  },
  getCartproducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      products = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ _id: objectid(userId) });
      console.log(products);
      resolve(products.user_cart);
    });
  },
  placeOrder: (details, products, total, userId) => {
    console.log(total);
    return new Promise(async (resolve, reject) => {
      let status = details.payment === "COD" || "Wallet" ? "Placed" : "Pending";
      let dated = moment().format("LL");
      total = parseInt(total);
      orderObj = {
        UserId: objectid(userId),

        DeliveryDetails: {
          name: details.name,
          phone_number: details.phone,
          email: details.email,
          label: details.address,
          pincode: details.pincode,
          city: details.city,
          state: details.state,
        },

        Products: products,
        PaymentMethod: details.payment,
        Amount: total,
        OrderedDate: dated,
        PaymentStatus: status,
      };
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((result) => {
          console.log(result.insertedId);
          //  db.get().collection(collections.ORDER_COLLECTION).updateOne({_id:result.insertedId},{$push:{'Products':{'item':{'order_status':status}}}})
          // db.get().collection(collections.ORDER_COLLECTION).updateOne({$and:[{_id:result.insertedId},{'Products.item':products[0].item}]},{$set:{'Products.$.orderstatus':status}},{'multi':true}).then(output=>{
          // console.log(output);
          for (i = 0; i < products.length; i++) {
            db.get()
              .collection(collections.PRODUCT_COLLECTION)
              .updateMany(
                { _id: products[i].item },
                { $inc: { stock: -products[i].quantity } }
              );
          }
          if (details.payment === "Wallet") {
            let obj = {
              Description: "Product purchase",
              Type: "Debit",
              Date: dated,
              Amount: total,
            };

            db.get()
              .collection(collections.USER_COLLECTION)
              .updateOne(
                { _id: objectid(userId) },
                { $push: { WalletHistory: obj }, $inc: { Wallet: -total } }
              );
          }
          resolve(result.insertedId);
        });

      //})

      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne({ _id: objectid(userId) }, { $unset: { user_cart: "" } });
    });
  },
  placeOrdersaved: (details, products, total, userId) => {
    console.log("third" + total);
    return new Promise(async (resolve, reject) => {
      details.index = parseInt(details.index);
      let status = details.payment === "COD" || "Wallet" ? "Placed" : "Pending";
      let address = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .aggregate([
          { $match: { _id: objectid(userId) } },
          {
            $project: {
              address: { $arrayElemAt: ["$address", details.index] },
            },
          },
        ])
        .toArray();
      console.log(address);
      let dated = moment().format("LL");
      orderObj = {
        UserId: objectid(userId),
        DeliveryDetails: address[0].address,
        Products: products,
        PaymentMethod: details.payment,
        Amount: total,
        OrderedDate: dated,
        PaymentStatus: status,
      };
      console.log(products);
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((result) => {
          //  db.get().collection(collections.ORDER_COLLECTION).aggregate([{$match:{_id:objectid(result.insertedId)}},{$addFields:{Products:{'orderstatus':status}}}])
          // db.get().collection(collections.ORDER_COLLECTION).updateMany({$and:[{_id:result.insertedId},{'Products.item':'products.item'}]},{$set:{'Products.$.orderstatus':status}})
          //db.get().collection(collections.ORDER_COLLECTION).updateMany({_id:result.insertedId},{$expr:{$eq:{'$Products.item':'$products[0].item'}}},{$set:{'Products.$.orderstatus':status}})
          if (status === "Placed") {
            for (i = 0; i < products.length; i++) {
              db.get()
                .collection(collections.PRODUCT_COLLECTION)
                .updateMany(
                  { _id: products[i].item },
                  { $inc: { stock: -products[i].quantity } }
                );
            }
          }
          if (details.payment === "Wallet") {
            console.log("wallaet");
            let obj = {
              Description: "Product purchase",
              Type: "Debit",
              Date: dated,
              Amount: total,
            };

            db.get()
              .collection(collections.USER_COLLECTION)
              .updateOne(
                { _id: objectid(userId) },
                { $push: { WalletHistory: obj }, $inc: { Wallet: -total } }
              );
          }
          resolve(result.insertedId);
        });

      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne({ _id: objectid(userId) }, { $unset: { user_cart: "" } });
    });
  },

  findUser: (phone_number) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ phone_number: phone_number });
      if (user) {
        resolve(user);
      } else {
        reject("Invalid mobile number");
      }
    });
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
                Amount: 1,
                DeliveryDetails: 1,
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
                Amount: 1,
                DeliveryDetails: 1,
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
  getOrderProduct: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .find({ UserId: objectid(userId) })
        .toArray();
      if (orders.length>=1) {
        resolve(orders.reverse());
        console.log(orders+'dgsdgds');
      } else {
        console.log('fd');
        reject();
      }
      //     let cart = await db
      //       .get()
      //       .collection(collections.ORDER_COLLECTION)
      //       .aggregate([
      //         { $match: { UserId: objectid(userId) } },
      //         { $unwind: "$Products" },
      //         {
      //           $project: {
      //             item: "$Products.item",
      //             quantity: "$Products.quantity",
      //             PaymentMethod: 1,
      //             PaymentStatus: 1,
      //             Date: 1,
      //             OrderedDate: 1,
      //             UserId: 1,
      //             Amount:1,
      //             DeliveryDetails:1
      //           },
      //         },
      //         {
      //           $lookup: {
      //             from: collections.PRODUCT_COLLECTION,
      //             localField: "item",
      //             foreignField: "_id",
      //             as: "orderproducts",
      //           },
      //         },
      //         {
      //           $project: {
      //             quantity: 1,
      //             orderproducts: { $arrayElemAt: ["$orderproducts", 0] },
      //             PaymentMethod: 1,
      //            PaymentStatus: 1,
      //             OrderedDate: 1,
      //             UserId: 1,
      //             Amount:1,
      //             DeliveryDetails:1
      //           },
      //         },
      //       ])
      //       .toArray();
      //     console.log(cart);
      //     resolve(cart);
      //   } else {
      //     reject();
      //   }
    });
  },
  deleteOrder: (details, products) => {
    return new Promise((resolve, reject) => {
      details.amount = parseInt(details.amount);

      console.log(details);
      let history = {
        Description: "Cancelling an order",
        Type: "Credit",
        Date: moment().format("LL"),
        Amount: details.amount,
      };
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          {
            $and: [
              { UserId: objectid(details.userId) },
              { _id: objectid(details.orderId) },
            ],
          },
          //   { $pull: { Products: { item: objectid(details.productId) } } }
          { $set: { PaymentStatus: "Cancelled" } }
        )
        .then((result) => {
          console.log(result);
          for (i = 0; i < products.length; i++) {
            db.get()
              .collection(collections.PRODUCT_COLLECTION)
              .updateMany(
                { _id: products[i].item },
                { $inc: { stock: products[i].quantity } }
              )
              .then((res) => {
                console.log(res);
              });
          }
          if (details.method != "COD") {
            db.get()
              .collection(collections.USER_COLLECTION)
              .updateOne(
                { _id: objectid(details.userId) },
                {
                  $inc: { Wallet: details.amount },
                  $addToSet: { WalletHistory: history },
                }
              );
          }
        });

      resolve();
    });
  },
  checkPassword: (userId, oldPass) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ _id: objectid(userId) });
      bcrypt.compare(oldPass.password, user.password).then((result) => {
        if (result) resolve({ status: true });
        else resolve({ status: false });
      });
    });
  },
  changePassword: (userId, newPass) => {
    return new Promise(async (resolve, reject) => {
      newPass.password = await bcrypt.hash(newPass.password, 10);
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne(
          { _id: objectid(userId) },
          { $set: { password: newPass.password } }
        );
      resolve({ status: true });
    });
  },
  getUserdetails: (userId) => {
    return new Promise(async (resolve, reject) => {
      // let savedaddress = await db
      //   .get()
      //   .collection(collections.USER_COLLECTION)
      //   .aggregate([
      //     { $match: { _id: objectid(userId) } },
      //     { $unwind: "$address" },
      //     { $project: { address:{ "$address":1 }} }

      //   ])
      //   .toArray();
      // console.log(savedaddress);

      let user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ _id: objectid(userId) });
      resolve(user);
    });
  },
  getuserOrder: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .findOne({ _id: objectid(userId) });
      resolve(user);
      console.log(user);
    });
  },
  editProfile: (details, userId) => {
    return new Promise(async (resolve, reject) => {
      phoneexists = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({
          $and: [
            { phone_number: details.phone_number },
            { _id: { $ne: objectid(userId) } },
          ],
        });
      console.log("dsgsadgsdgsdg" + phoneexists);
      if (phoneexists) {
        console.log("ibide");
        reject();
      } else {
        // console.log(details.address);
        let address = {
          name: details.username,
          email: details.email,
          phone_number: details.phone_number,
          useraddress: details.address,
          pincode: details.pincode,
          city: details.city,
          state: details.state,
          country: details.country,
        };
        db.get()
          .collection(collections.USER_COLLECTION)
          .updateOne(
            { _id: objectid(details.userid) },
            {
              //   $addToSet: { address },
              $set: {
                username: details.username,
                phone_number: details.phone_number,
                email: details.email,
                education: details.education,
                profileaddress: address,
              },
            }
          );
        resolve();
      }
    });
  },
  addAddress: (details, userId) => {
    return new Promise((resolve, reject) => {
      addobj = {
        name: details.username,
        email: details.email,
        phone_number: details.phone_number,

        label: details.address,
        pincode: details.pincode,
        city: details.city,
        state: details.state,
      };
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne(
          { _id: objectid(userId) },
          { $addToSet: { address: addobj } }
        );
      resolve();
    });
  },
  getAddress: (userId) => {
    return new Promise(async (resolve, reject) => {
      let address = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .aggregate([
          { $match: { _id: objectid(userId) } },
          { $unwind: "$address" },
          { $project: { address: "$address" } },
        ])
        .toArray();
      // let address=await  db.get().collection(collections.USER_COLLECTION).aggregate([{$match:{_id:objectid(userId)}},{$unwind:'$address'},{$project:{address:'$address'}}]).toArray()

      console.log(address);
      console.log("hii addresss");
      resolve(address);
    });
  },
  generateRazorpay: (orderId, total) => {
    console.log(total);
    console.log("ithaanu" + orderId);
    console.log("pinnyum" + total);
    return new Promise((resolve, reject) => {
      instance.orders
        .create({
          amount: total * 100,
          currency: "INR",
          receipt: "" + orderId,
          notes: {
            key1: "value3",
            key2: "value2",
          },
        })
        .then((result) => {
          console.log(result);
          resolve(result);
        });
    });
  },
  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      var crypto = require("crypto");

      var expectedSignature = crypto.createHmac(
        "sha256",
        "Mn0WRR8jVHNsshE4GpBAxHrM"
      );
      expectedSignature = expectedSignature.update(
        details["order[id]"] + "|" + details["response[razorpay_payment_id]"]
      );
      expectedSignature = expectedSignature.digest("hex");

      console.log(details["response[razorpay_payment_id]"]);
      console.log(expectedSignature);
      if (expectedSignature === details["response[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },
  changePaymentstatus: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectid(details) },
          {
            $set: {
              PaymentStatus: "Placed",
            },
          }
        );
      resolve();
    });
  },
  createPay: (payment) => {
    return new Promise((resolve, reject) => {
      paypal.payment.create(payment, function (err, payment) {
        if (err) {
          reject(err);
        } else {
          resolve(payment);
        }
      });
    });
  },
  changeOrderstatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectid(orderId) },
          {
            $set: {
              PaymentStatus: "Placed",
            },
          }
        );
      resolve();
    });
  },
  deleteAddress: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne(
          { _id: objectid(details.userid) },
          {
            $pull: {
              address: {
                name: details.name,
                email: details.email,
                phone_number: details.number,
                label: details.label,
                pincode: details.pin,
                city: details.city,
                state: details.state,
              },
            }, //   { $pull: { user_cart: { item: objectid(details.product) } } }
          }
        )
        .then((result) => {
          console.log(result);
        });
      resolve();
    });
  },
  checkCode: (code, userId) => {
    console.log(code, userId);
    return new Promise(async (resolve, reject) => {
      if (code == userId) {
        reject();
      } else {
        // let user= await db.get().collection(collections.USER_COLLECTION).findOne({$and:[{_id:objectid(code)},{'referralUsed':true}]}).catch((err)=>{
        // reject()
        // })
        try {
          // let user= await db.get().collection(collections.USER_COLLECTION).aggregate([{$match:{_id:objectid(code)}}]).toArray()
          let user = await db
            .get()
            .collection(collections.USER_COLLECTION)
            .findOne({
              $and: [{ _id: objectid(code) }, { referralUsed: true }],
            });

          if (!user) {
            let transactionDetails = {
              Description: "Reffering a friend",
              Type: "Credit",
              Date: moment().format("LL"),
              Amount: 100,
            };
            let Details = {
              Description: "Claiming a Refferal ",
              Type: "Credit",
              Date: moment().format("LL"),
              Amount: 50,
            };
            db.get()
              .collection(collections.USER_COLLECTION)
              .updateOne(
                { _id: objectid(code) },
                {
                  $set: { referralUsed: true },
                  $inc: { Wallet: 100 },
                  $push: { WalletHistory: transactionDetails },
                }
              )
              .then(() => {
                db.get()
                  .collection(collections.USER_COLLECTION)
                  .updateOne(
                    { _id: objectid(userId) },
                    { $inc: { Wallet: 50 }, $push: { WalletHistory: Details } }
                  );
                console.log("sdhsh");
                resolve();
              })
              .catch(() => {
                console.log("ibde");
                reject();
              });
          } else {
            reject();
            console.log("216464");
          }
        } catch (e) {
          reject();
        }
      }
    });
  },
  walletHistory: (userId) => {
    return new Promise(async (resolve, reject) => {
      let history = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .aggregate([
          { $match: { _id: objectid(userId) } },
          { $unwind: "$WalletHistory" },
          { $project: { WalletHistory: 1 } },
        ])
        .toArray();

      resolve(history.reverse());
    });
  },
  addtoWishlist: (userId, proId) => {
    return new Promise(async (resolve, reject) => {
      wishExists = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({
          $and: [{ _id: objectid(userId) }, { Wishlist: objectid(proId) }],
        });
      console.log(wishExists);
      let wish = objectid(proId);
      if (!wishExists) {
        db.get()
          .collection(collections.USER_COLLECTION)
          .updateOne(
            { _id: objectid(userId) },
            { $addToSet: { Wishlist: wish } }
          );
        resolve();
      } else {
        reject();
      }
    });
  },
  getWishlist: (userId) => {
    return new Promise(async (resolve, reject) => {
      let wish = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .aggregate([
          { $match: { _id: objectid(userId) } },
          { $unwind: "$Wishlist" },

          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: "Wishlist",
              foreignField: "_id",
              as: "orderproducts",
            },
          },
          {
            $project: {
              orderproducts: { $arrayElemAt: ["$orderproducts", 0] },
            },
          },
        ])
        .toArray();
      //  console.log(wish);
      if (wish.length == 0) {
        reject();
      } else {
        resolve(wish.reverse());
      }
    });
  },
  checkCoupon: (details, totalAmount) => {
    return new Promise(async (resolve, reject) => {
      if (details.coupon == undefined) {
        console.log("thettti");
        resolve({ total: totalAmount });
      }
      let couponExists = await db
        .get()
        .collection(collections.COUPON_COLLECTION)
        .findOne({ name: details.coupon });
      if (couponExists) {
        // console.log(couponExists);
        if (totalAmount < couponExists.min) {
          resolve({ total: totalAmount });
        } else {
          let discount = (totalAmount * couponExists.offer) / 100;
          if (discount > couponExists.max) {
            totalAmount = totalAmount - couponExists.max;
            discount = couponExists.max;
            resolve({ total: totalAmount, discount });
          } else {
            let total = totalAmount - discount;
            console.log(discount, total);
            resolve({ discount, total });
          }
        }
      } else {
        total = totalAmount;
        //  console.log('ibde');
        reject("Invalid /Expired coupon");
        //resolve({total})
      }
    });
  },
  removeWishlist: (productId, userId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne(
          { _id: objectid(userId) },
          { $pull: { Wishlist: objectid(productId) } }
        )
        .then((result) => {
          console.log(result);
        });
      let wish = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .aggregate([
          { $match: { _id: objectid(userId) } },
          { $project: { Wishlist: 1 } },
        ])
        .toArray();
      console.log(wish);
      resolve(wish[0].Wishlist.length);
    });
  },
  searchItem: (details) => {
    return new Promise(async (resolve, reject) => {
      let search = details.search.slice(0, 3);

      let result = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({
          $or: [
            {
              name: { $regex: ".*" + details.search + ".*", $options: "i" },
            },
            { category: new RegExp(details.search, "i") },
          ],
        })
        .toArray();
      console.log(search);
      console.log(result);
      if (result.length != 0) {
        resolve(result);
      } else {
        reject();
        console.log("dgsd");
      }
    });
  },

  getProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .aggregate([
          { $match: { _id: objectid(orderId) } },
          { $project: { Products: 1 } },
        ])
        .toArray();
      resolve(products[0].Products);
      console.log(products);
    });
  },
  getStock: (productId) => {
    return new Promise(async (resolve, reject) => {
      let stock = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .aggregate([
          { $match: { _id: objectid(productId) } },
          { $project: { stock: 1 } },
        ])
        .toArray();
      console.log(stock);
      resolve(stock[0].stock);
    });
  },
  getProductCount:()=>{
    return new Promise(async(resolve, reject) => {
let count =await db.get().collection(collections.PRODUCT_COLLECTION).count()
      resolve(count)
    })
  },
  getPaginatedProducts: (skip, limit) => {
    return new Promise(async (resolve, reject) => {
        let products = await db.get().collection(collections.PRODUCT_COLLECTION).find().skip(skip).limit(limit).toArray()
        resolve(products)
       })
    },
};
