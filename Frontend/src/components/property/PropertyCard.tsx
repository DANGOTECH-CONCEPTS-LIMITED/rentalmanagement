import { Property } from "@/types/property";
import { BedDouble, MapPin, Home } from "lucide-react";

interface PropertyCardProps {
  property: Property;
  formatCurrency: (amount: number) => string;
  onClick: () => void;
}

const PropertyCard = ({
  property,
  formatCurrency,
  onClick,
}: PropertyCardProps) => {
  return (
    <div
      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-52 bg-muted">
        {property.imageUrl ? (
          <img
            src={property.imageUrl}
            alt={property.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Home size={32} />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded">
          {formatCurrency(property.price)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg truncate">{property.name}</h3>
        <p className="text-muted-foreground text-sm flex items-center mt-1">
          <MapPin size={14} className="mr-1 flex-shrink-0" />
          <span className="truncate">{property.address ?? property.district ?? property.region ?? "-"}</span>
        </p>

        <div className="flex justify-between mt-3 text-sm">
          <div className="flex items-center">
            <BedDouble size={14} className="mr-1" />
            {property.numberOfRooms} {property.numberOfRooms === 1 ? "Room" : "Rooms"}
          </div>
          <div className="text-muted-foreground">{property.type ?? "Property"}</div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
