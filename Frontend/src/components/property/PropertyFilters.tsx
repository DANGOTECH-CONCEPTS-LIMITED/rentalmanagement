
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

interface FiltersState {
  propertyType: string;
  minBedrooms: string;
  maxPrice: string;
}

interface PropertyFiltersProps {
  searchTerm: string;
  filters: FiltersState;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
  onResetFilters: () => void;
}

const PropertyFilters = ({
  searchTerm,
  filters,
  onSearchChange,
  onFilterChange,
  onResetFilters
}: PropertyFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, address, or property type..."
          className="pl-10"
          value={searchTerm}
          onChange={onSearchChange}
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          name="propertyType"
          value={filters.propertyType}
          onChange={onFilterChange}
          className="border border-input rounded-md p-2 h-10 text-sm"
        >
          <option value="">All Types</option>
          <option value="Apartment">Apartment</option>
          <option value="House">House</option>
          <option value="Studio">Studio</option>
          <option value="Condominium">Condominium</option>
        </select>
        
        <Input
          name="minBedrooms"
          type="number"
          placeholder="Min Bedrooms"
          value={filters.minBedrooms}
          onChange={onFilterChange}
          className="w-32"
        />
        
        <Input
          name="maxPrice"
          type="number"
          placeholder="Max Price (UGX)"
          value={filters.maxPrice}
          onChange={onFilterChange}
          className="w-40"
        />
        
        <Button onClick={onResetFilters} variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PropertyFilters;
