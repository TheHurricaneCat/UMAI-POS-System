import TrayContainer from "./pos-components/TrayContainer";

export function TrayManager({ tray, handleProductIncrement, handleProductDecrement }) {
  return (
    <div className="productPreview">
      {tray.map((content) => (
        <TrayContainer 
          key={content.id} 
          content={content} 
          handleProductIncrement={handleProductIncrement} 
          handleProductDecrement={handleProductDecrement} 
        />
      ))}
    </div>
  );
}
