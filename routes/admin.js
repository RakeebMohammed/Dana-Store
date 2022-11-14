var express = require("express");
var router = express.Router();
var db = require("../config/connection");
var userHelpers = require("../helpers/userhelpers");
var productHelpers = require("../helpers/producthelpers");
var adminHelpers = require("../helpers/adminhelpers");

const verifyLogin = (req, res, next) => {
  if (req.session.adminLogged) {
    next();
  } else {
    res.render("user/login", { admin: true ,noheader:true});
  }
};

/* GET home page. */
router.get("/", async function (req, res, next) {
 try{

  let adminesh = req.session.admin;
  if (adminesh) {
    totalSale = await adminHelpers.totalSale();
    totalOrders = await adminHelpers.totalOrders();
    totalCustomers = await adminHelpers.totalCustomers();
    allStatus = await adminHelpers.allStatus();
    monthlySale = await adminHelpers.monthlySale();
    getMonths = await adminHelpers.getMonths();
    getYears = await adminHelpers.getYears();
    getDays = await adminHelpers.getDays();
    orders = await adminHelpers.getAllorders();
    res.render("admin/adminhome", {
      admin: true,
      adminesh,
      totalSale,
      totalOrders,
      totalCustomers,
      allStatus,
      monthlySale,
      getMonths,
      getYears,
      getDays,
      orders,
    });
  } else {
    res.render("user/login", { admin: true,noheader:true, loginerr: req.session.loginErr });
    req.session.loginErr = null;
  }
}
catch(e){
 
  res.redirect('/errors')

}
});
router.post("/", (req, res) => {
  //console.log(req.body);
try{


  userHelpers
    .adminLogin(req.body)
    .then((admin) => {
      req.session.adminLogged = true;
      req.session.admin = admin;
      console.log(admin);
      res.redirect("/admin");
    })
    .catch(() => {
      req.session.loginErr = "Enter valid email and password";
      res.redirect("/admin/");
    });
  }
catch(e){ res.redirect('/errors')
}
});

//displaying all products
router.get("/products", verifyLogin, (req, res) => {
 try{
  productHelpers.allProducts().then((products) => {
    console.log(products);
    res.render("admin/products", { admin: true, products });
  });}
  catch(e){  res.redirect('/errors')
}
});
//editing a single product
router.get("/editproduct/:id", verifyLogin, (req, res) => {
 try{

  productHelpers.editProduct(req.params.id).then((result) => {
    productHelpers.findCategory().then((category) => {
      res.render("admin/addproduct", { admin: true, result, category });
    });
  });
}
catch(e){   res.redirect('/errors')
}
});
//getting datas from the edit page
router.post("/editproduct/:id", verifyLogin,(req, res) => {
 try{

 
  let id = req.params.id;
  req.body.price = parseInt(req.body.price);
  req.body.stock = parseInt(req.body.stock);
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect("/admin/products");
    console.log(req.files?.image);
    if (req.files?.image !== undefined) {
      let image = req.files?.image;

      image.mv("./public/product-images/" + id + ".jpg");
    }
  });
}
catch(e){  res.redirect('/errors')
}
});
//deleting a product
router.get("/deleteproduct/:id", verifyLogin, (req, res) => {
 try{

  productHelpers.deleteProduct(req.params.id).then(() => {
    res.redirect("/admin/products");
  });
}
catch(e){  res.redirect('/errors')
}
});

//getting add-product page
router.get("/addproduct", verifyLogin, (req, res) => {
 try{

  productHelpers.findCategory().then((category) => {
    res.render("admin/addproduct", { admin: true, category });
  });}
  catch(e){   res.redirect('/errors')
}
});
//adding new product details
router.post("/addproduct", verifyLogin,(req, res) => {
  try{

  
  req.body.price = parseInt(req.body.price);
  req.body.stock = parseInt(req.body.stock);
  productHelpers.addProduct(req.body).then((result) => {
    console.log(req.files);
    let image = req.files.image;
    console.log(req.body);
    console.log(result);
    image.mv("./public/product-images/" + result + ".jpg", (err) => {
      if (!err) {
        // let image1=req.files.image1;
        // image1.mv('./public/product-images/'+result+'1'+'.jpg',(err)=>{
        //   if(!err){
        //     let image2=req.files.image2;
        //     image2.mv('./public/product-images/'+result+'2'+'.jpg',(err)=>{
        //       if(!err){
        res.redirect("/admin/addproduct");
      } else {
        console.log("thett");
      }
    });

    //  }
  });
  }
  catch(e){   res.redirect('/errors')
}
  //  }})
});

//}))
//getting all users page
router.get("/allusers", verifyLogin, (req, res) => {
 try{

  userHelpers.allUsers().then((users) => {
    res.render("admin/alluser", { admin: true, users });
  });}
  catch(e){   res.redirect('/errors')
}
});
//blocking a user
router.get("/blockuser/:id",verifyLogin, (req, res) => {
 
 try{

  userHelpers.blockUser(req.params.id).then(() => {
    res.redirect("/admin/allusers");
  });}
  catch(e){   res.redirect('/errors')
}
});
//unblocking a user
router.get("/unblockuser/:id",verifyLogin, (req, res) => {
 try{

 
  userHelpers.unblockUser(req.params.id).then(() => {
    console.log(req.params.id);
    res.redirect("/admin/allusers");
  });
}
catch(e){  res.redirect('/errors')
}
});
//clicking categories page
router.get("/categories", verifyLogin, (req, res) => {
 try{

  productHelpers.findCategory().then((result) => {
    res.render("admin/categories", {
      result,
      admin: true,
      Err: req.session.err,
    });
    req.session.err = null;
  });}
  catch(e){   res.redirect('/errors')
}
});
//inserting a category
router.post("/insertcategory",verifyLogin, (req, res) => {
 try{

  productHelpers
    .insertCategory(req.body)
    .then(() => {
      res.redirect("/admin/categories");
    })
    .catch((err) => {
      req.session.err = err;
      res.redirect("/admin/categories");
    });
  }
  catch(e){   res.redirect('/errors')
}
});
//selecting a category
router.get("/categoryselect/:id", verifyLogin, (req, res) => {
try{

 productHelpers.selectCategory(req.params.id).then((result) => {
    console.log(result);
    res.render("admin/categoryselect", { result, admin: true });
  });
}
catch(e){  res.redirect('/errors')
}
});
//editing a category
router.get("/editcategory/:id", verifyLogin, (req, res) => {
 try{

  productHelpers.editCategory(req.params.id).then((category) => {
    console.log(req.params.id);
    res.render("admin/categories", { category, admin: true });
  });
 }
 catch(e){   res.redirect('/errors')
}
});
//after editing
router.post("/editcategory/:id",verifyLogin, (req, res) => {
 try{

  productHelpers
    .editCategorydata(req.params.id, req.body)
    .then(() => {
      console.log(req.params.id);
      res.redirect("/admin/categories");
    })
    .catch((err) => {
      req.session.err = err;
      res.redirect("/admin/categories");
    });
  }
  catch(e){   res.redirect('/errors')
}
});

//deleting a category
router.get("/deletecategory/:id", verifyLogin, (req, res) => {
 try{

  productHelpers
    .deleteCategory(req.params.id)
    .then(() => {
      res.redirect("/admin/categories");
    })
    .catch((err) => {
      req.session.err = err;
      res.redirect("/admin/categories");
    });
  }
  catch(e){   res.redirect('/errors')
}
  });
//get allorders
router.get("/allorders", verifyLogin, (req, res) => {
 try{

  adminHelpers.getAllorders().then((result) => {
     result=result.reverse()
    res.render("admin/allorders", { admin: true, result });
  });
}
catch(e){   res.redirect('/errors')
}
});
router.get("/orderdetails/:id", verifyLogin, (req, res) => {
 try{

 
  adminHelpers.getOrderProducts(req.params.id).then((result) => {
    res.render("admin/orderdetails", { admin: true, result });
  });
}
catch(e){   res.redirect('/errors')
}
});
router.post("/deleteorder",verifyLogin, (req, res) => {
 try{

 
  console.log(req.body);
  adminHelpers.changeUserorder(req.body).then(() => {
    console.log("hi daaa");
    res.json({ status: true });
  });
}
catch(e){  res.json()
}
});
//logging out from the site
router.get("/logout",verifyLogin, function (req, res, next) {
  req.session.admin = null;
  req.session.adminLogged = false;
  res.redirect("/admin");
});
//addcoupon page 
router.get('/coupons',verifyLogin, async(req,res)=>{
 try{

 
  let category=await productHelpers.findCategory()
 let coupons=await productHelpers.findCoupons()
 let offers=await productHelpers.findOffers() 
 res.render('admin/coupons',{admin:true,category,coupons,offers})
 }
 catch(e){   res.redirect('/errors')
}
})
//addcoupon link
router.get('/addcoupon',verifyLogin, async(req,res)=>{
 try{

  let category=await productHelpers.findCategory()
  res.render('admin/addcoupon',{admin:true,category})
 }
 catch(e){   res.redirect('/errors')
}
})
//adding coupon
router.post('/addcoupon',verifyLogin,(req,res)=>{
 try{

  console.log(req.body);
  adminHelpers.addCoupon(req.body).then(()=>{
    res.json({status:true})
  })
}
catch(e){  res.json()
}
})
//adding offer
router.post('/addoffer',verifyLogin,(req,res)=>{
 try{

  console.log(req.body);
  adminHelpers.addOffer(req.body).then((id)=>{
  productHelpers.changePrice(id).then(()=>{

  })
    res.json({status:true})
  })
}
catch(e){  res.json()}
})
//deletecoupon
router.get('/deletecoupon/:id',verifyLogin,(req,res)=>{
 try{

  adminHelpers.deleteCoupon(req.params.id).then(()=>{
res.json({status:true})
  })
}
catch(e){  res.json()
}
})
//deleteoffer
router.post('/deleteoffer',verifyLogin,(req,res)=>{
 try{
  adminHelpers.deleteOffer(req.body).then(()=>{
res.json({status:true})
  })}
  catch(e){  res.json()
}
})
//page to banner
router.get('/banners',verifyLogin,(req,res)=>{
  try{
    adminHelpers.getBanner().then((result=>{
    res.render('admin/banner',{admin:true,result})
  })).catch(err=>{
    res.render('admin/banner',{admin:true})
  })
}
catch(e){  res.redirect('/errors')
}
})

//router post banner
router.post('/addbanner',verifyLogin,(req,res)=>{
 try{

  console.log(req.body);
  adminHelpers.addBanner(req.body).then(id=>{
    console.log(req.files);
    image=req.files.image
    image.mv("./public/product-images/" + id + ".jpg", (err) => {
   if(!err){
    res.redirect('/admin/banners')
   }
   else{
   res.redirect('/admin/banners')
   }
  })

  })
}
catch(e){   res.redirect('/errors')
}
})
//deleting banner
router.get('/deletebanner/:id',verifyLogin,(req,res)=>{
 try{

  adminHelpers.deleteBanner(req.params.id).then(()=>{
    res.json({status:true})
  }).catch(()=>{
    res.json({status:false})
  })}
  catch(e){  res.json()}
})
module.exports = router;
