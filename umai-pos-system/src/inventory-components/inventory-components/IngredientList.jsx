import React from 'react';

const IngredientList = () => {
 const ingredients = [
    { name: 'Bun', image: 'bun.jpg', orders: 12 },
    { name: 'Patty', image: 'patty.jpg', orders: 12 },
    { name: 'Lettuce', image: 'lettuce.jpg', orders: 12 },
    { name: 'Tomato', image: 'tomato.jpg', orders: 12 },
    { name: 'Cheese', image: 'cheese.jpg', orders: 12 },
    { name: 'Onion', image: 'onion.jpg', orders: 12 },
    { name: 'Sauce', image: 'sauce.jpg', orders: 12 },
    { name: 'Egg', image: 'egg.jpg', orders: 12 },
 ];

 return (
    <div className="ingredient-list">
        <div style={{ backgroundColor: 'aqua', padding: '10px', marginBottom: '10px' }}>Ingredients ↓</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
    {ingredients.map((ingredient, index) => (
        <div key={index} style={{ width: '20%', padding: '5px', textAlign: 'center' }}>
        <img src={`/images/${ingredient.image}`} alt={ingredient.name} style={{ width: '80px', height: '80px' }} />
        <div>{ingredient.orders} orders</div>
 </div>
 ))}
 </div>
 </div>
 );
};

export default IngredientList;