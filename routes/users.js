let express = require("express");
let router = express.Router();
let db = require("../config/connection");
let userhelpers = require("../helpers/userhelpers");
let productHelpers = require("../helpers/producthelpers");
let adminHelpers = require("../helpers/adminhelpers");
const e = require("express");
const { RoleInstance } = require("twilio/lib/rest/conversations/v1/role");
var objectid = require("objectid");

require("dotenv").config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = require("twilio")(accountSid, authToken);

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

router.get("/otplogin", (req, res) => {
  res.render("user/otplogin",{nofooter:true});
});
router.post("/sendotp", (req, res) => {
  var num = req.body.number;
  req.session.num = num;
  console.log(num);
  userhelpers
    .findUser(num)
    .then((user) => {
      //  console.log(user);

      client.verify.v2
        .services("VAbaedbbfe8e8b18a297d839b635bc7612")
        .verifications.create({ to: "+91" + num, channel: "sms" })
        .then((verification) => {
          console.log(verification.status);
          req.session.preuser = user;
          res.render("user/otplogin", { otp: true });
        });
    })
    .catch((err) => {
      req.session.err = err;
      res.render("user/otplogin", { loginerr: req.session.err });
      req.session.err = null;
    });
});
router.post("/verifyotp", (req, res) => {
  let otp = req.body.otp;

  num = req.session.num;
  //console.log(otp);
  client.verify.v2
    .services("VAbaedbbfe8e8b18a297d839b635bc7612")
    .verificationChecks.create({ to: "+91" + num, code: otp })
    .then((verification_check) => {
      console.log(verification_check.status);

      if (verification_check.status == "approved") {
        req.session.user = req.session.preuser;
        req.session.loggedIn = true;
        // console.log(user);
        res.redirect("/");
      } else {
        req.session.err = "Incorrect otp";
        res.render("user/otplogin", { otp: true, loginerr: req.session.err });
        req.session.err = null;
      }
    })
    .catch(() => {});
});
//home page
router.get("/", async function (req, res, next) {
 // try {
    let cartcount = null;
  //  
  const perPage = 9;
  let pageNum;
  let skip;
  let productCount;
  let pages;
  pageNum = parseInt(req.query.page) >= 1 ? parseInt(req.query.page) : 1;
  console.log(typeof (pageNum))
  skip = (pageNum - 1) * perPage
  await userhelpers.getProductCount().then((count) => {
    productCount = count;
  })
  pages = Math.ceil(productCount / perPage)
  const Handlebars=require('handlebars')
  Handlebars.registerHelper('ifCond', function (v1, v2, options) {
    if (v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
  });
  Handlebars.registerHelper('for', function (from, to, incr, block) {
    var accum = '';
    for (var i = from; i <= to; i += incr)
      accum += block.fn(i);
    return accum;
  });
  //  
    if (req.session.user) {
      console.log(cartcount);
      cartcount = await userhelpers.getcartCount(req.session.user._id);
    }
    let banner = await adminHelpers.getBanner();
    console.log("error");
    console.log(banner);
    // console.log(req.session.user);
    let user = req.session.user;
    userhelpers.getPaginatedProducts(skip,perPage).then((products) => {
      productHelpers.findCategory().then((result) => {
        for (i = 0; i < products.length; i++) {
          console.log(products[i]);
          if (products[i].stock == 0) {
            products[i].nostock = true;
          }
        }
        if (user) {
          console.log(result);
          res.render("user/index", {
            user,
            products,
            result,
            cartcount,
            banner,
            index: true,home:true,all:true,pages,currentPage:pageNum
          });
        } else {
          res.render("user/index", { products, result, banner, index: true ,home:true,all:true,pages,currentPage:pageNum});
        }
      });
    });
 // } catch (e) {
//    res.redirect("/errors");
 // }
});
//selcting a single category
router.get("/selectcategory/:id", (req, res) => {
  console.log(req.params.id);
  try {
    productHelpers.selectCategory(req.params.id).then((products) => {
      productHelpers.findCategory().then(async (result) => {
        let banner = await adminHelpers.getBanner();
        for (i = 0; i < products.length; i++) {
          console.log(products[i]);
          if (products[i].stock == 0) {
            products[i].nostock = true;
          }
        }
         cat=req.params.id
      console.log(cat);
       
       
        if (req.session.user) {
          cartcount = await userhelpers.getcartCount(req.session.user._id);
          res.render("user/index", {
            products,
            user: req.session.user,
            result,
            banner,
            cartcount,
            index: true,home:true,cat
          });
        } else {
          res.render("user/index", {
            products,
            user: req.session.user,
            result,
            banner,
            index: true,home:true,cat
          });
        }
      });
    });
  } catch (e) {
    res.redirect("/errors");
  }
});

//displaying login page
router.get("/login", function (req, res, next) {
  res.render("user/login", {
    loginerr: req.session.loggedError,
    relogin: req.session.reloggedIn,
    nofooter: true,
  });
  req.session.loggedError = null;
  req.session.reloggedIn = null;
});
//entered datas from login page
router.post("/login", (req, res, next) => {
  // console.log(req.body);
  userhelpers
    .doLogin(req.body)
    .then((returned) => {
      userhelpers
        .isBlocked(returned.user._id)
        .then(() => {
          //   console.log(returned.user._id);
          if (returned.result) {
            req.session.loggedIn = true;
            req.session.user = returned.user;
            res.redirect("/");
          }
        })
        .catch((error) => {
          req.session.loggedError = error;
          res.redirect("/login");
        });
    })
    .catch((error) => {
      req.session.loggedError = error;
      res.redirect("/login");
    });
});
//view product individually
router.get("/viewproduct/:id", function (req, res, next) {
  try {
    productHelpers.viewProduct(req.params.id).then(async (result) => {
      let cartcount = 0;
      let wishPresent = false;
      if (req.session.user) {
        cartcount = await userhelpers.getcartCount(req.session.user._id);
        wishlist = await userhelpers
          .getWishlist(req.session.user._id)
          .catch(() => {
            wishPresent=false
          });
        console.log(wishlist);
        if (wishlist) {
          for (i = 0; i < wishlist.length; i++) {
           if ((wishlist[i].orderproducts._id).toString() == req.params.id) {
              console.log("ind");
              wishPresent = true;
            }
          }
        }
        console.log(wishPresent);
      }
      res.render("user/viewproduct", {
        result,
        user: req.session.user,
        cartcount,
        wishPresent,
      });
    });
  } catch (e) {
    res.redirect("/errors");
  }
});

//signup page
router.get("/signup", function (req, res, next) {
  res.render("user/signup", { Error: req.session.Err, nofooter: true });
  req.session.Err = null;
});
//datas from the signup page
router.post("/signup", function (req, res, next) {
  console.log(req.body);
  if (req.body.password == req.body.cpassword) {
    userhelpers
      .doSignup(req.body)
      .then(() => {
        req.session.reloggedIn = "Please login to enter";
        res.redirect("/login");
      })
      .catch((error) => {
        req.session.Err = error;
        res.redirect("/signup");
      });
  } else {
    req.session.Err = "Password mismatch";
    res.redirect("/signup");
  }
});

//logging out from site
router.get("/logout", verifyLogin, (req, res) => {
  req.session.loggedIn = false;
  req.session.user = null;
  res.redirect("/");
});
//addtocart
router.get("/addtocart/:id", async (req, res, next) => {
  try {
    if (req.session.user._id) {
      let stock = await userhelpers.getStock(req.params.id);
      if (stock == 0) {
        res.json({ nostock: true });
      } else {
        userhelpers
          .addtoCart(req.params.id, req.session.user._id)
          .then((count) => {
            let result = { count, status: true };
            res.json(result);
          });
      }
    } else {
      console.log("ibdee");
      res.json({ status: false });
    }
  } catch (e) {
    res.redirect("/errors");
  }
});

//cart page
router.get("/cart", verifyLogin, async(req, res) => {
  try {
    cartcount = await userhelpers.getcartCount(req.session.user._id);
       
    userhelpers
      .getCart(req.session.user._id)
      .then(async (cart) => {
       
        let totalAmount = await userhelpers.totalAmount(req.session.user._id);
        res.render("user/cart", {
          cart,
          user: req.session.user,
          totalAmount,
          cartcount,
        });
      })
      .catch(() => {
        res.render("user/cart", { cartEmpty: true, user: req.session.user ,cartcount});
      });
  } catch (e) {
    res.redirect("/errors");
  }
});
//product quantity changing
router.post("/changequantity", verifyLogin, async (req, res) => {
  try {
    max = await userhelpers.getStock(req.body.productId);
    console.log(max);
    req.body.quantity = parseInt(req.body.quantity);
    if (req.body.quantity == max && req.body.count == 1) {
      res.json({ status: false });
    } else {
      userhelpers.changeQuantity(req.body).then(async (count) => {
        count.totalAmount = await userhelpers.totalAmount(req.session.user._id);
        res.json(count);
        // console.log(count);
      });
    }
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
// removing cart productitems
router.post("/deleteitems", verifyLogin, (req, res) => {
  try {
    console.log(req.body);
    userhelpers.deleteItem(req.body).then(() => {
      res.json({ status: true });
    });
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//checkout

router.get("/checkout", verifyLogin, async (req, res) => {
  try {
    let totalAmount = await userhelpers.totalAmount(req.session.user._id);
    cartcount = await userhelpers.getcartCount(req.session.user._id);
    let wallet = await userhelpers.getUserdetails(req.session.user._id);
    let coupons = await productHelpers.findCoupons();
    userhelpers.individualTotal(req.session.user._id).then(async (result) => {
      let address = await userhelpers.getAddress(req.session.user._id);
      if (wallet.Wallet >= totalAmount) {
        res.render("user/checkout", {
          totalAmount,
          user: req.session.user,
          result,
          address,
          wallet,
          cartcount,
          coupons,
        });
      } else {
        res.render("user/checkout", {
          totalAmount,
          user: req.session.user,
          result,
          address,
          wallet,
          nowallet: true,
          cartcount,
          coupons,
        });
      }
    });
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//deleting address
router.post("/deleteaddress", verifyLogin, (req, res) => {
  try {
    console.log(req.body);
    userhelpers.deleteAddress(req.body).then(() => {
      console.log("ibde ethi");
      res.json({ status: true });
    });
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//order placing
router.post("/place_order", verifyLogin, async (req, res) => {
  try {
    console.log(req.body);

    products = await userhelpers.getCartproducts(req.session.user._id);
    console.log(products);
    totalamount = await userhelpers.totalAmount(req.session.user._id);
    userhelpers.checkCoupon(req.body, totalamount).then((total) => {
      totalamount = total.total;

      console.log(totalamount);
      userhelpers
        .placeOrder(req.body, products, totalamount, req.session.user._id)
        .then((orderId) => {
          let payments = req.body.payment;
          if (payments === "COD" || payments === "Wallet") {
            console.log("ibdee" + req.body.payment);
            let codstatus = { codpage: orderId, codstatus: true };
            res.json(codstatus);
          } else if (payments === "Razorpay") {
            console.log("ibdee ethiii");
            userhelpers
              .generateRazorpay(orderId, totalamount)
              .then((response) => {
                console.log("ibde ethi" + response.status);
                response.resultpage = orderId;
                response.razor = true;
                res.json(response);
              });
          } else if (payments === "Paypal") {
            var payment = {
              intent: "authorize",
              payer: {
                payment_method: "paypal",
              },
              redirect_urls: {
                return_url: `https://danastore.ga/ordersuccess/${orderId}`,
                cancel_url: "https://danstore.ga/err",
              },
              transactions: [
                {
                  amount: {
                    total: totalamount,
                    currency: "USD",
                  },
                  description: " a book on mean stack ",
                },
              ],
            };
            userhelpers
              .createPay(payment)
              .then((transaction) => {
                var id = transaction.id;
                console.log(id);
                var links = transaction.links;
                console.log(links);

                var counter = links.length;
                while (counter--) {
                  if (links[counter].rel == "approval_url") {
                    console.log(links[counter].href);
                    transaction.link = links[counter].href;
                    console.log(links[counter].method);
                    // redirect to paypal where user approves the transaction
                    //  return res.redirect( links[counter].href )
                    userhelpers.changeOrderstatus(orderId).then(() => {
                      transaction.paypal = true;
                      transaction.orderId = orderId;
                      res.json(transaction);
                    });
                  }
                }
              })
              .catch((err) => {
                console.log(err);
                res.redirect("/error");
              });
          }
        });
    });
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});

//order placed using saved address
router.post("/place_orders", verifyLogin, async (req, res) => {
  // try {
  console.log(req.body);
  console.log(req.body.coupon);
  products = await userhelpers.getCartproducts(req.session.user._id);
  console.log(products);
  totalamount = await userhelpers.totalAmount(req.session.user._id);
  // console.log(totalamount);
  userhelpers
    .checkCoupon(req.body, totalamount)
    .then((total) => {
      totalamount = total.total;
      console.log("first" + total.total);
      console.log("second" + totalamount);

      userhelpers
        .placeOrdersaved(req.body, products, totalamount, req.session.user._id)
        .then((orderId) => {
          console.log(req.body.payment);
          let payments = req.body.payment;
          if (payments === "COD" || payments === "Wallet") {
            console.log("ibdee" + req.body.payment);
            let codstatus = { codpage: orderId, codstatus: true };
            res.json(codstatus);
          } else if (payments === "Razorpay") {
            console.log("ibdee ethiii");
            userhelpers
              .generateRazorpay(orderId, totalamount)
              .then((response) => {
                console.log("ibde ethi" + response.status);
                response.resultpage = orderId;
                response.razor = true;
                res.json(response);
              });
          } else if (payments === "Paypal") {
            var payment = {
              intent: "authorize",
              payer: {
                payment_method: "paypal",
              },
              redirect_urls: {
                return_url: `https://danastore.ga/ordersuccess/${orderId}`,
                cancel_url: "https://danastore.ga/err",
              },
              transactions: [
                {
                  amount: {
                    total: totalamount,
                    currency: "USD",
                  },
                  description: " a book on mean stack ",
                },
              ],
            };
            userhelpers
              .createPay(payment)
              .then((transaction) => {
                var id = transaction.id;
                console.log(id);
                var links = transaction.links;
                console.log(links);

                var counter = links.length;
                while (counter--) {
                  if (links[counter].rel == "approval_url") {
                    console.log(links[counter].href);
                    transaction.link = links[counter].href;
                    console.log(links[counter].method);
                    // redirect to paypal where user approves the transaction
                    //  return res.redirect( links[counter].href )
                    userhelpers.changeOrderstatus(orderId).then(() => {
                      transaction.paypal = true;
                      transaction.orderId = orderId;
                      res.json(transaction);
                    });
                  }
                }
              })
              .catch((err) => {
                console.log(err);
                //   res.redirect("/error");
              });
          }
        });
    })
    .catch((err) => {
      res.redirect("/user/checkout");
    });
  // } catch (e) {
  //   console.log(e);
  //   res.redirect('/errors')
  // }
});
//error on payment
router.get("/error", verifyLogin, (req, res) => {
  res.render("user/error", { user: req.session.user });
});
//verify payment
router.post("/verifypayment", verifyLogin, (req, res) => {
  try {
    console.log("entthaadaaa monuss");
    console.log(req.body);
    userhelpers
      .verifyPayment(req.body)
      .then(() => {
        userhelpers.changePaymentstatus(req.body["order[receipt]"]).then(() => {
          console.log("payment successfull");
          res.json({ status: true });
        });
      })
      .catch((err) => {
        //console.log(err);
        res.json({ status: false });
      });
  } catch (e) {
    res.json();
  }
});
//page after order
router.get("/ordersuccess/:id", verifyLogin, async (req, res) => {
  try {
    result = await userhelpers.getOrderProducts(req.params.id);
    orders = await userhelpers.getuserOrder(req.params.id);
    res.render("user/order_success", {
      user: req.session.user,
      result,
      orders,
    });
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//displaying the order details
router.get("/orderdetails/:id", verifyLogin, (req, res) => {
  try {
    userhelpers
      .getOrderProducts(req.params.id)
      .then(async (result) => {
        // products=await userhelpers.getOrderProduct(req.session.user._id)
        cartcount = await userhelpers.getcartCount(req.session.user._id);

        orders = await userhelpers.getuserOrder(req.params.id);
        let stepper = {};
        if (orders.PaymentStatus == "Placed") {
          stepper.placed = true;
        } else if (orders.PaymentStatus == "Shipped") {
          stepper.shipped = true;
          stepper.placed = true;
        } else if (orders.PaymentStatus == "Delivered") {
          stepper.delivered = true;
          stepper.shipped = true;
          stepper.pending = true;
        } else if (orders.PaymentStatus == "Cancelled")
          stepper.cancelled = true;
        res.render("user/orderdetails", {
          user: req.session.user,
          result,
          orders,
          stepper,
          cartcount,profile:true
        });
      })
      .catch(() => {
        res.render("user/orderdetails", {
          user: req.session.user,
          image: true,
          cartcount,profile:true
        });
      });
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//going back to order page
router.get("/orders", verifyLogin,async (req, res) => {
  try {
    cartcount = await userhelpers.getcartCount(req.session.user._id);
     
    userhelpers.getOrderProduct(req.session.user._id).then(async (result) => {
      res.render("user/orders", { user: req.session.user, result, cartcount,profile:true });
    }).catch(()=>{
      res.render("user/orders", { user: req.session.user, image:true, cartcount,profile:true });
   
    });
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//

//user deleting the order
router.post("/deleteorder", verifyLogin, async (req, res) => {
  try {
    let products = await userhelpers.getProducts(req.body.orderId);
    console.log(req.body);
    userhelpers.deleteOrder(req.body, products).then(() => {
      res.json({ status: true });
    });
  } catch (e) {
    res.json();
  }
});
//users profile page

router.get("/profile", verifyLogin, (req, res) => {
  try {
    userhelpers.getUserdetails(req.session.user._id).then(async (result) => {
      //console.log(result);
      cartcount = await userhelpers.getcartCount(req.session.user._id);
      history = await userhelpers.walletHistory(req.session.user._id);
      console.log(history);
      res.render("user/profile", {
        user: req.session.user,
        result,
        history,
        cartcount,
        profile:true
      });
    });
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//editing profile
router.post("/editprofile", verifyLogin, (req, res) => {
  try {
   
    
    userhelpers.editProfile(req.body,req.session.user._id).then(() => {
      res.json({ status: true });
    }).catch(()=>{
      res.json({status:false})
    });
  
  } catch (e) {
    res.json();
  }
});
//adding new address
router.post("/addaddress", verifyLogin, (req, res) => {
  try {
    userhelpers.addAddress(req.body, req.session.user._id).then(() => {
      res.json({ status: true });
    });
  } catch (e) {
    res.json();
  }
});

//checking old password
router.post("/checkpassword", verifyLogin, (req, res) => {
  try {
    userhelpers.checkPassword(req.session.user._id, req.body).then((result) => {
      console.log(result);
      res.json(result);
    });
  } catch (e) {
    res.json();
  }
});
//creating new password
router.post("/newpassword", verifyLogin, (req, res) => {
  try {
    if (req.body.password === req.body.cpassword) {
      userhelpers
        .changePassword(req.session.user._id, req.body)
        .then((result) => {
          console.log(result);
          res.json(result);
        });
    } else {
      res.json({ status: false });
    }
  } catch (e) {
    res.json();
  }
});

//referral code checking
router.get("/checkcode/:id", verifyLogin, (req, res) => {
  try {
    userhelpers
      .checkCode(req.params.id, req.session.user._id)
      .then(() => {
        res.json({ status: true });
      })
      .catch(() => {
        res.json({ status: false });
      });
  } catch (e) {
    res.json();
  }
});
//wishlist page
router.get("/wishlist", verifyLogin, async (req, res) => {
  try {
    cartcount = await userhelpers.getcartCount(req.session.user._id);
    userhelpers
      .getWishlist(req.session.user._id)
      .then((result) => {
        res.render("user/wishlist", {
          user: req.session.user,
          result,
          cartcount,profile:true
        });
      })
      .catch(() => {
        res.render("user/wishlist", {
          user: req.session.user,
          nowish: true,
          cartcount,wishlist:true
        });
      });
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//adding to wishlsit page addtowishlist
router.get("/addtowishlist/:id", verifyLogin, (req, res) => {
  try {
   if(!req.session.user._id){
    console.log('fhh');
res.json({status:false})
   }
   else{
    console.log('fhhsdgsdgsd');
   
    userhelpers
      .addtoWishlist(req.session.user._id, req.params.id)
      .then(() => {
        res.json({ status: true });
      })
      .catch(() => {
        res.json({ exists: true });
      });}
  } catch (e) {
  console.log('thett');
   res.json();
  }
});
//applyin gcoupon
router.post("/applycoupon", verifyLogin, async (req, res) => {
  try {
    console.log(req.body);
    let totalAmount = await userhelpers.totalAmount(req.session.user._id);

    userhelpers
      .checkCoupon(req.body, totalAmount)
      .then((result) => {
        console.log(result);

        res.json(result);
      })
      .catch((err) => {
        res.json(err);
      });
  } catch (e) {
    res.json();
  }
});
//remove from wishlist
router.get("/remove-from-wishlist/:id", verifyLogin, (req, res) => {
  try {
    console.log(req.params.id);
    userhelpers
      .removeWishlist(req.params.id, req.session.user._id)
      .then((result) => {
        console.log(result);
        res.json(result);
      });
  } catch (e) {
    res.json();
  }
});
//searching
router.post("/search", async (req, res) => {
  try {
    console.log(req.body);
    let banner = await adminHelpers.getBanner();
    if (req.session.loggedIn) {
      cartcount = await userhelpers.getcartCount(req.session.user._id);

      userhelpers
        .searchItem(req.body)
        .then(async (products) => {
          for (i = 0; i < products.length; i++) {
            console.log(products[i]);
            if (products[i].stock == 0) {
              products[i].nostock = true;
            }
          }
          res.render("user/index", {
            products,
            user: req.session.user,
            banner,
            cartcount,
            index: true,home:true
          });
        })
        .catch(() => {
          res.render("user/index", {
            user: req.session.user,
            banner,
            notfound: true,
            cartcount,
            index: true,home:true
          });
        });
    } else {
      userhelpers
        .searchItem(req.body)
        .then(async (products) => {
          res.render("user/index", { products, banner, index: true ,home:true});
        })
        .catch(() => {
          res.render("user/index", { banner, notfound: true, index: true,home:true });
        });
    }
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//contact
router.get("/contact", (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.render("user/contact", { user: req.session.user ,contact:true});
    } else {
      res.render("user/contact",{contact:true});
    }
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//about
router.get("/about", (req, res) => {
  try {
    if (req.session.loggedIn) {
      
      res.render("user/about", { user: req.session.user ,about:true});
    } else {
      res.render("user/about",{about:true});
    }
  } catch (e) {
    console.log(e);
    res.redirect("/errors");
  }
});
//error page
router.get("/errors", (req, res) => {
  res.render("user/404");
});

module.exports = router;
