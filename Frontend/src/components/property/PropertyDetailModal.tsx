
import { Property } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, DoorOpen, User, X } from 'lucide-react';

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
              <div className="relative h-80 bg-muted rounded-lg mb-4">
                {property.imageUrl ? (
                  <img
                    src={property.imageUrl}
                    alt={property.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Building2 size={40} />
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center">
                  <MapPin size={16} className="mr-1" />
                  {property.address ?? "-"}
                </p>
                <p className="flex items-center">
                  <DoorOpen size={16} className="mr-1" />
                  {property.numberOfRooms} rooms
                </p>
                {property.type && <p>Type: {property.type}</p>}
                {(property.district || property.region) && (
                  <p>{[property.district, property.region].filter(Boolean).join(", ")}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg">{property.name}</h3>
              <div className="mt-4 text-2xl font-bold text-primary">
                {formatCurrency(property.price)}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ month</span>
              </div>
              {property.description && (
                <p className="mt-4 text-sm text-muted-foreground">{property.description}</p>
              )}
              <div className="mt-4">
                <h4 className="font-medium mb-2">Landlord</h4>
                <p className="text-sm flex items-center">
                  <User size={14} className="mr-1" />
                  {property.owner?.fullName ?? "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailModal;
