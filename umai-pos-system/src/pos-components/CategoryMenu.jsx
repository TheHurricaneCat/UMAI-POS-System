import styles from './CategoryMenu.module.css';

function CategoryMenu({productList = [], handleScrollToCategory, categoryRefs}) {
    
    return (
        <>
            <div className={styles.rootContainer}>
                <div className={styles.categoryContainer}> 
                    {productList.map((category) => (
                        <button 
                            className={styles.category} 
                            onClick={() => handleScrollToCategory(category.name)}
                        > 
                            {category.name} 
                        </button>
                    ))}
                </div>
                <div className={styles.categoryButtons}> 
                    <button className={styles.addButton}> + </button>
                    <button className={styles.subtractButton}> - </button>
                </div>
            </div>
            
        </>
    );
}

export default CategoryMenu;