var db = require("../config/connection");
var collections = require("../config/collections");
const bcrypt = require("bcrypt");
var objectid = require("objectid");

module.exports = {
  addProduct: (product) => {
    return new Promise((resolve, reject) => {
      product.MRP = product.price;
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .insertOne(product)
        .then((data) => {
          resolve(data.insertedId);
          console.log(data.insertedId);
        });
    });
  },
  allProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find()
        .toArray();

      resolve(products);
    });
  },
  editProduct: (userId) => {
    return new Promise(async (resolve, reject) => {
      let product = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .findOne({ _id: objectid(userId) });
      resolve(product);
      console.log(product);
    });
  },
  updateProduct: (userId, productDet) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .updateOne(
          { _id: objectid(userId) },
          {
            $set: {
              name: productDet.name,
              description: productDet.description,
              category: productDet.category,
              price: productDet.price,
              stock: productDet.stock,
            },
          }
        );
      resolve();
    });
  },
  deleteProduct: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .deleteOne({ _id: objectid(userId) })
        .then((data) => {
          console.log(data);
          resolve();
        });
    });
  },
  viewProduct: (productId) => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .findOne({ _id: objectid(productId) });

      resolve(products);
    });
  },
  findCategory: () => {
    return new Promise(async (resolve, reject) => {
      let category = await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .find()
        .toArray();

      resolve(category);
    });
  },
  selectCategory: (categoryName) => {
    return new Promise(async (resolve, reject) => {
      let product = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({ category: categoryName })
        .toArray();

      resolve(product);
    });
  },
  insertCategory: (categoryName) => {
    return new Promise(async (resolve, reject) => {
      let categoryExists = await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .findOne({ category: categoryName.category });
      if (categoryExists) {
        reject("Category already exists");
      } else {
        db.get()
          .collection(collections.CATEGORY_COLLECTION)
          .insertOne({ category: categoryName.category });
        resolve();
      }
    });
  },
  editCategory: (categoryId) => {
    return new Promise((resolve, reject) => {
      let category = db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .find({ _id: objectid(categoryId) })
        .toArray();
      resolve(category);
    });
  },
  editCategorydata: (categoryName, data) => {
    return new Promise(async (resolve, reject) => {
      let categoryExists = await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .findOne({ category: data.category });
      console.log(categoryExists);
      if (categoryExists) {
        reject("Category already exists");
      } else {
        console.log(data.category);
        db.get()
          .collection(collections.CATEGORY_COLLECTION)
          .updateOne(
            { category: categoryName },
            { $set: { category: data.category } }
          );
        db.get()
          .collection(collections.PRODUCT_COLLECTION)
          .updateMany(
            { category: categoryName },
            { $set: { category: data.category } }
          );
        resolve();
      }
    });
  },
  deleteCategory: (categoryName) => {
    return new Promise(async (resolve, reject) => {
      isnotEmpty = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({ category: categoryName })
        .toArray();
      if (isnotEmpty.length == 0) {
        db.get()
          .collection(collections.CATEGORY_COLLECTION)
          .deleteOne({ category: categoryName });
        resolve();
      } else {
        let length = isnotEmpty.length;
        reject(`This category can't be deleted,it contains ${length} products`);
      }
    });
  },
  changePrice: (id) => {
    return new Promise(async (resolve, reject) => {
     console.log(id);
        let product = await db
        .get()
        .collection(collections.OFFER_COLLECTION)
        .findOne({ _id: objectid(id) });
        console.log(product);
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .updateMany({ category: product.category }, [
          {
            $set: {
              price: {
                $subtract: [
                  "$MRP",
                  { $multiply: ["$MRP", { $divide: [product.coffer, 100] }] },
                ],
              },
            },
          },
        ]).then(result=>{
            console.log(result);
            resolve()
        });
       
       
    });
  },
  findCoupons:(()=>{
    return new Promise(async(resolve, reject) => {
        let coupons=await db.get().collection(collections.COUPON_COLLECTION).find().toArray()
        console.log(coupons);
        resolve(coupons)
    })
  }),
  findOffers:(()=>{
    return new Promise(async(resolve, reject) => {
        let coupons=await db.get().collection(collections.OFFER_COLLECTION).find().toArray()
        console.log(coupons);
        resolve(coupons)
    })
  })
};
