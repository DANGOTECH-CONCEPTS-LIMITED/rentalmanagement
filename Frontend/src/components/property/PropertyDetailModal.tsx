
import { Property } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Bed, Bath, Square, MapPin, X } from 'lucide-react';

interface PropertyDetailModalProps {
  property: Property;
  formatCurrency: (amount: number) => string;
  onClose: () => void;
}

const PropertyDetailModal = ({ property, formatCurrency, onClose }: PropertyDetailModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{property.name}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="relative h-80 mb-4">
                <img 
                  src={property.images[0]} 
                  alt={property.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {property.images.slice(1).map((image, index) => (
                  <div key={index} className="h-24">
                    <img 
                      src={image} 
                      alt={`${property.name} ${index + 2}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">{property.name}</h3>
              <p className="text-muted-foreground flex items-center mt-1">
                <MapPin size={16} className="mr-1" />
                {property.address}
              </p>
              
              <div className="mt-4 text-2xl font-bold text-primary">
                {formatCurrency(property.rentAmount)}<span className="text-sm font-normal text-muted-foreground ml-1">/ month</span>
              </div>
              
              <div className="border-t border-b py-4 my-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex flex-col items-center">
                      <Bed size={20} />
                      <span className="font-semibold mt-1">{property.bedrooms}</span>
                      <span className="text-xs text-muted-foreground">Bedrooms</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex flex-col items-center">
                      <Bath size={20} />
                      <span className="font-semibold mt-1">{property.bathrooms}</span>
                      <span className="text-xs text-muted-foreground">Bathrooms</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex flex-col items-center">
                      <Square size={20} />
                      <span className="font-semibold mt-1">{property.area} m²</span>
                      <span className="text-xs text-muted-foreground">Area</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Amenities</h4>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity, index) => (
                    <span key={index} className="bg-muted px-2 py-1 rounded-md text-xs">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Landlord</h4>
                <p className="text-sm">{property.landlord}</p>
              </div>
              
              <div className="mt-6">
                <Button className="w-full">Request Viewing</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailModal;
