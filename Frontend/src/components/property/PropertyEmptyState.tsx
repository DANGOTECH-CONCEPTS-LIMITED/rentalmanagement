
import { Home } from 'lucide-react';

const PropertyEmptyState = () => {
  return (
    <div className="py-8 flex flex-col items-center justify-center text-center">
      <Home className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No properties found</h3>
      <p className="text-muted-foreground mt-1">
        Try adjusting your filters or search criteria
      </p>
    </div>
  );
};

export default PropertyEmptyState;
