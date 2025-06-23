import { useState, useRef, useEffect } from 'react';
import styles from './DropdownMenu.module.css';

function DropdownMenu({ title, buttons, className, buttonColor = 'default' }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Map the button color prop to the corresponding CSS class
    const getButtonColorClass = (color) => {
        const colorMap = {
            'red': styles.redButton,
            'blue': styles.blueButton,
            'green': styles.greenButton,
            'yellow': styles.yellowButton,
            'gray': styles.grayButton,
            'orange': styles.orangeButton,
            'default': styles.defaultButton,
        };
        return colorMap[color] || styles.defaultButton;
    };

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className={`${styles.dropdown} ${className || ''}`} ref={dropdownRef}>
            <button 
                className={`${styles.dropdownButton} ${className || ''}`} 
                onClick={toggleDropdown}
            >
                {title} ▼
            </button>
            
            {isOpen && (
                <div className={styles.dropdownContent}>
                    {buttons.map((button, index) => {
                        const buttonColorClass = button.color ? 
                            getButtonColorClass(button.color) : 
                            getButtonColorClass(buttonColor);
                        
                        return (
                            <button 
                                key={index} 
                                className={`${styles.dropdownItem} ${buttonColorClass} ${button.className || ''}`}
                                onClick={() => {
                                    button.onClick();
                                    setIsOpen(false);
                                }}
                            >
                                {button.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default DropdownMenu;
