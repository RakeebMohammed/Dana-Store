

function addtocart(productId)
{
  let cart=$('#cart-count').html()
$.ajax({
    
    url:'/addtocart/'+productId,
    method:'get',
    success:(result=>{
     
        // count=document.getElementById("cart-count").innerHTML
        
        // count=parseInt(count)+1;
        // console.log(count)
        // document.getElementById("cart-count").innerHTML=count
       if(result.status){

 console.log('ibdee');
 console.log(result);
 result.count=parseInt(result.count)
       console.log(result.count);
       console.log(result.status);
      
       // let count=$('#cart-count').html()
      //  count=parseInt(count)+1
        $('#cart-count').html(result.count)
      }
    
     
      else{
        console.log('third');
        window.location.replace('/login')
      }
    }
   

    )
})


}

$(document).ready(function(){
  let stable=document.querySelectorAll('.stable') 
 let minus=document.querySelectorAll('.quantity')
 for(i=0;i<minus.length;i++){
  head= minus[i].innerHTML
  console.log(head)
  if(head==1){
    stable[i].disabled=true
  }
 }



})

function quantitychange(userId,productId,count)
{
  let quantity=parseInt(document.getElementById(productId).innerHTML)
  count=parseInt(count)
  if(  quantity==1) 
  {
   $('#minus'+productId).prop('disabled',true);
 // const inner = select.querySelectorAll('.stable');
  
  }
$.ajax({
  url:'/changequantity',
  data:{
    userId,productId,count,quantity
  },
  method:'post',
 success:(result=>{
  if(result.status){
  if(quantity===2 && count===(-1) )
 {
  $('#minus'+productId).prop('disabled',true)
  // document.getElementById("minus").style.display="none";
   document.getElementById(productId).innerHTML=quantity+count
   document.getElementById("subtotal").innerHTML=result.totalAmount
   document.getElementById("total").innerHTML=result.totalAmount 
 }
 else{
 $('#minus'+productId).prop('disabled',false)
  document.getElementById(productId).innerHTML=quantity+count
    document.getElementById("subtotal").innerHTML=result.totalAmount
    document.getElementById("total").innerHTML=result.totalAmount
    $(`#max${productId}`).hide()
 }
   
  
  
    // if(quantity==1){
    //   document.getElementById("minus").style.display="none";
    // }
  }
  else{
    console.log('max')
    $(`#max${productId}`).show()
    $(`#max${productId}`).html('Product stock reached its limit').delay(200)
  //  $("#codesuccess").delay(200).fadeOut(300);
  }

 })
})

}
function removeitem(userId,productId)
{
 console.log(userId);
  $.ajax({
    url:'/deleteitems',
   data:{
user:userId,
product:productId
   },
    method:'post',
    success:((result)=>{
      if(result.status){
      location.reload()
      }
    })
  })
} 
// function removeminus(){
//   let a=document.getElementById("quantity").innerHTML
//   console.log(a);
//   if(a==1){
//     document.getElementById("minus").style.display="none"
//   }
// }
// function selectproduct(catName){
//   $.ajax({
//     url:'/selectcategory/'+catName,
//     method:'get',
//     success:(products)=>{

// document.getElementById(catName).style.backgroundColor="yellow "
// location.reload()
//     }
//   })
// }