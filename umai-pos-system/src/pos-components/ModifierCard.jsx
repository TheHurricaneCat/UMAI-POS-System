import styles from './ModifierCard.module.css';

function ModifierCard({modifierClass, addModifier}) {
    
    return (
        <div className={styles.rootContainer} onClick={(e) =>  {
            e.stopPropagation();
            addModifier(modifierClass)}
        }>  
            <div className={styles.detailsContainer}>
                <p> {modifierClass.name} </p>
            </div>
            <div className={styles.decorationHeader}> 
                <p> + </p>
            </div>
        </div>
    )
}

export default ModifierCard