import React from 'react';

const StockLevels = () => {
 const burgerIngredients = [
        { name: 'Buns', current: 100, max: 100 },
        { name: 'Beef Patty', current: 2, max: 50 },
        { name: 'Lettuce', current: 100, max: 100 },
        { name: 'Tomatoes', current: 64, max: 100 },
        { name: 'Cheese', current: 105, max: 150 },
        { name: 'Onions', current: 50, max: 200 },
        { name: 'Onions', current: 200, max: 200 },
 ];

 const hotdogIngredients = [
    { name: 'Bun', current: 200, max: 200 },
 ];

 return (
    <div className="stock-levels" style={{ backgroundColor: 'aqua', padding: '10px' }}>
    <div style={{ backgroundColor: 'yellow', padding: '10px', marginBottom: '10px', textAlign: 'center' }}>Stock Status: Need (No restock required...)</div>
    <div>
        <h3>STOCK LEVELS</h3>
        <h4>Burger Ingredients</h4>
 <ul>
    {burgerIngredients.map((item, index) => (
        <li key={index} style={{ listStyleType: 'none' }}>
            <span style={{ color: item.current < item.max / 2 ? 'red' : 'green' }}>●</span> {item.name} {item.current}/{item.max}
 </li>
 ))}
 </ul>
    <h4>Hotdog Ingredients</h4>
 <ul>
    {hotdogIngredients.map((item, index) => (
        <li key={index} style={{ listStyleType: 'none' }}>
        <span style={{ color: 'green' }}>●</span> {item.name} {item.current}/{item.max}
 </li>
 ))}
 </ul>
 </div>
    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-around' }}>
    <button style={{ padding: '5px', backgroundColor: '#ddd' }}>Refresh Database</button>
 <button style={{ padding: '5px', backgroundColor: '#ddd' }}>Sort</button>
 </div>
 </div>
 );
};

export default StockLevels;