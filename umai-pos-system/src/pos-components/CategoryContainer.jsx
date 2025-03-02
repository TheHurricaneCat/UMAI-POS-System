import styles from './CategoryContainer.module.css';
import ProductCard from './ProductCard.jsx';
import ModifierCard from './ModifierCard.jsx';
import { Category } from '../handlers/DataHandler.js';

function CategoryContainer({category, type, addToTray, addModifier, categoryRefs, index}) {
    const colors = ["#FFDE59", "#3DCDC4", "#4766C2"];
    const backgroundColor = colors[index % colors.length];
    
    if (type === 'product') {
        return (
            <>
            <div 
                className={styles.categoryHeader}
                ref={(el) => (categoryRefs.current[category.name] = el)}
            >
                <h2 
                    className={styles.categoryHeaderBorder}
                    style={{backgroundColor: backgroundColor}}
                    > {category.name} </h2> 
                <div 
                    className={styles.productListContainer}
                    style={{borderLeft: `30px solid ${backgroundColor}`}}
                    > 
                    {category.products.map((product) => (
                        <ProductCard productClass={product} addToTray={addToTray} />
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
                <h2 
                    className={styles.categoryHeaderBorder}
                    style={{backgroundColor: backgroundColor}}
                > 
                {category.name} </h2>
                <div 
                    className={styles.productListContainer}
                    style={{borderLeft: `30px solid ${backgroundColor}`}}
                > 
                    {category.products.map((product) => (
                        <ModifierCard modifierClass={product}
                        addModifier={addModifier} />
                    ))}
                </div>
            </div>
            </>
        );
    }
    
}

export default CategoryContainer