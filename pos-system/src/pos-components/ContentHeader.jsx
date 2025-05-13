import styles from './ContentHeader.module.css';

function ContentHeader({titleText}) {
  return (
      <>
        <div className={styles.productHeaderViewer}> 
          <div className={styles.titleBackground}>
              <svg 
                viewBox="0 0 24 24" 
                version="1.1" 
                xmlns="http://www.w3.org/2000/svg" 
                xmlnsXlink="http://www.w3.org/1999/xlink" 
                fill="white" // Change to a specific color
                className="titleIcon" // Add a class to style it easier
                opacity="0.2"
                
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier"> 
                  <title>Products</title> 
                  <g fill="none" fillRule="evenodd" id="page-1" stroke="none" strokeWidth="1"> 
                    <g id="navigation-icon" transform="translate(-325.000000, -80.000000)"> 
                      <g id="group" transform="translate(325.000000, 80.000000)"> 
                        <polygon fill="#FFFFFF" fillOpacity="0.01" fillRule="nonzero" id="path" points="24 0 0 0 0 24 24 24"></polygon> 
                        <polygon id="path" points="22 7 12 2 2 7 2 17 12 22 22 17" stroke="white" strokeLinejoin="round" strokeWidth="1.5"></polygon> 
                        <line id="path" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="2" x2="12" y1="7" y2="12"></line> 
                        <line id="path" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="12" x2="12" y1="22" y2="12"></line> 
                        <line id="path" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="22" x2="12" y1="7" y2="12"></line> 
                        <line id="path" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="17" x2="7" y1="4.5" y2="9.5"></line> 
                      </g>
                    </g>
                  </g>
                </g>
              </svg>
              <h1> {titleText} </h1>
              <h1> {titleText} </h1>
          </div>
            <h3> CATEGORIES </h3>
            <h3> ITEMS </h3>
        </div>
      </>
  );
}

export default ContentHeader;