import React from 'react';

const ProductList = () => {
 const products = [
    { name: 'Burger 1', image: 'burger1.jpg', orders: 12 },
    { name: 'Burger 2', image: 'burger2.jpg', orders: 12 },
    { name: 'Burger 3', image: 'burger3.jpg', orders: 12 },
    { name: 'Burger 4', image: 'burger4.jpg', orders: 12 },
     { name: 'Burger 5', image: 'burger5.jpg', orders: 12 },
    { name: 'Burger 6', image: 'burger6.jpg', orders: 12 },
    { name: 'Burger 7', image: 'burger7.jpg', orders: 12 },
    { name: 'Burger 8', image: 'burger8.jpg', orders: 12 },
 ];

 return (
    <div className="product-list" style={{ marginBottom: '20px' }}>
        <div style={{ backgroundColor: 'yellow', padding: '10px', marginBottom: '10px' }}>Burgers / Products ↓</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
    {products.map((product, index) => (
        <div key={index} style={{ width: '20%', padding: '5px', textAlign: 'center' }}>
        <img src={`/images/${product.image}`} alt={product.name} style={{ width: '80px', height: '80px' }} />
    <div>{product.orders} orders</div>
 </div>
 ))}
 </div>
 </div>
 );
};

export default ProductList;