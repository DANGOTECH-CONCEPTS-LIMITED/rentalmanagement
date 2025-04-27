import { Property } from "@/pages/Landlord/RegisterTenants";
import { Bed, Bath, Square, MapPin } from "lucide-react";

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
      <div className="relative h-52">
        <img
          src={property.images[0]}
          alt={property.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded">
          {formatCurrency(property.rentAmount)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg truncate">{property.name}</h3>
        <p className="text-muted-foreground text-sm flex items-center mt-1">
          <MapPin size={14} className="mr-1 flex-shrink-0" />
          <span className="truncate">{property.address}</span>
        </p>

        <div className="flex justify-between mt-3">
          <div className="flex items-center text-sm">
            <Bed size={14} className="mr-1" />
            {property.bedrooms} {property.bedrooms === 1 ? "Bed" : "Beds"}
          </div>

          <div className="flex items-center text-sm">
            <Bath size={14} className="mr-1" />
            {property.bathrooms} {property.bathrooms === 1 ? "Bath" : "Baths"}
          </div>

          <div className="flex items-center text-sm">
            <Square size={14} className="mr-1" />
            {property.area} m²
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
