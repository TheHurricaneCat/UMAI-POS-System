import styles from './CategoryContainer.module.css';
import ProductCard from './ProductCard.jsx';
import ModifierCard from './ModifierCard.jsx';
import { Category } from '../handlers/DataHandler.js';

function CategoryContainer({category, type, addToTray, addModifier, categoryRefs}) {
    if (type === 'product') {
        return (
            <>
            <div 
                className={styles.categoryHeader}
                ref={(el) => (categoryRefs.current[category.name] = el)}
            >
                <h2 className={styles.categoryHeaderBorder}> {category.name} </h2> 
                <div className={styles.productListContainer}> 
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
                <h2> {category.name} </h2>
                <div className={styles.productListContainer}> 
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