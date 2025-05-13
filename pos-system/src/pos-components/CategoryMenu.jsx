import styles from './CategoryMenu.module.css';

function CategoryMenu({productList = [], handleScrollToCategory, categoryRefs}) {
    const colors = ["#FFDE59", "#3DCDC4", "#4766C2"];
    
    return (
        <>
            <div className={styles.rootContainer}>
                <div className={styles.categoryContainer}> 
                    {productList.map((category, index) => (
                        <div>
                            
                            <div
                            className={styles.category} 
                            style={{'--category-color': colors[index % colors.length]}}
                            onClick={() => handleScrollToCategory(category.name)}
                            tabIndex="0" /*This function enables focusability*/
                            role="button"
                            > 
                                <svg
                                    className={styles.categoryIcon}
                                    /* width="32"
                                    height="26" */
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                <path
                                    d="M14 13.9633H16V7.96331H10V9.96331H12.5858L7.25623 15.2929L8.67044 16.7071L14 11.3775V13.9633Z"
                                    fill="currentColor"
                                />
                                <path
                                    fill-rule="evenodd"
                                    clip-rule="evenodd"
                                    d="M23 19C23 21.2091 21.2091 23 19 23H5C2.79086 23 1 21.2091 1 19V5C1 2.79086 2.79086 1 5 1H19C21.2091 1 23 2.79086 23 5V19ZM19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21Z"
                                    fill="currentColor"
                                />
                                </svg>
                                {category.name} 
                            </div>
                        </div>  
                        
                    ))}
                </div>
                {/* <div className={styles.categoryButtons}> 
                    <button className={styles.addButton}> + </button>
                    <button className={styles.subtractButton}> - </button>
                </div> */}
            </div>
            
        </>
    );
}

export default CategoryMenu;