import styles from './CategoryContainer.module.css';
import ProductCard from './ProductCard.jsx';
import ModifierCard from './ModifierCard.jsx';
import { Category } from '../handlers/DataHandler.js';

function CategoryContainer({category, type, addToTray, addModifier, categoryRefs, index, currentProduct}) {
    const colors = ["#FFDE59", "#3DCDC4", "#4766C2"];
    const backgroundColor = colors[index % colors.length];

    if (category.name.toLowerCase().includes('discount') || category.isDiscount === true) {
        return null;
    }
    
    if (type === 'product') {
        return (
            <>
            <div 
                className={styles.categoryHeader}
                ref={(el) => (categoryRefs.current[category.name] = el)}
            >

                <div
                    className={styles.categoryHeaderBorder}
                    style={{'--category-color': backgroundColor}}
                    > 
                    
                    <h2> {category.name}  </h2>
                    <h3> {category.name}  </h3>
                </div> 
                <div 
                    className={styles.productListContainer}
                    > 
                    {category.products.map((product) => (
                        <ProductCard productClass={product} addToTray={addToTray} categoryColor={backgroundColor} />
                    ))}
                </div>
            </div>
            </>
        );
    } else if (type === 'modifier') {
        return (
            <>
            <div 
                className={styles.categoryHeader}
                ref={(el) => (categoryRefs.current[category.name] = el)}
            > 
                <div 
                    className={styles.categoryHeaderBorder}
                    style={{'--category-color': backgroundColor}}
                > 
                <h2> {category.name}  </h2>
                <h3> {category.name}  </h3>
                </div>
                <div 
                    className={styles.productListContainer}
                    /* style={{borderLeft: `30px solid ${backgroundColor}`}} */
                > 
                    {category.products.map((product) => (
                        <ModifierCard modifierClass={product}
                        addModifier={addModifier}
                        currentProduct={currentProduct} />
                    ))}
                </div>
            </div>
            </>
        );
    }
    
}

export default CategoryContainer