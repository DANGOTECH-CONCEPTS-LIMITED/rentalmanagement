
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Property } from '@/types/property';
import PropertyCard from '@/components/property/PropertyCard';
import PropertyDetailModal from '@/components/property/PropertyDetailModal';
import PropertyFilters from '@/components/property/PropertyFilters';
import PropertyEmptyState from '@/components/property/PropertyEmptyState';
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter';
import { getImageUrl } from '@/lib/imageUrl';

const AvailableProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [filters, setFilters] = useState({
    propertyType: '',
    minBedrooms: '',
    maxPrice: '',
  });

  const formatCurrency = useCurrencyFormatter();

  useEffect(() => {
    const fetchProperties = async () => {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const userData = JSON.parse(localStorage.getItem('user') ?? '{}');
      const token = userData?.token;
      try {
        const { data } = await axios.get(`${apiUrl}/GetAllProperties`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const mapped: Property[] = (data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name ?? 'Unnamed Property',
          address: [p.address, p.district, p.region].filter(Boolean).join(', '),
          type: p.type ?? 'Property',
          bedrooms: p.numberOfRooms ?? 0,
          bathrooms: 0,
          area: '',
          rentAmount: p.price ?? 0,
          currency: p.currency ?? 'UGX',
          images: p.imageUrl ? [getImageUrl(p.imageUrl)] : [
            'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&auto=format&fit=crop&q=60'
          ],
          amenities: [],
          status: 'available',
          landlord: p.owner?.fullName ?? '',
          description: p.description ?? '',
          region: p.region ?? '',
          district: p.district ?? '',
        }));
        setProperties(mapped);
        setFilteredProperties(mapped);
      } catch {
        // silently fail — empty state will show
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperties();
  }, []);

  useEffect(() => {
    // Apply filters and search
    let result = [...properties];
    
    // Apply search
    if (searchTerm) {
      result = result.filter(property => 
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply property type filter
    if (filters.propertyType) {
      result = result.filter(property => property.type === filters.propertyType);
    }
    
    // Apply minimum bedrooms filter
    if (filters.minBedrooms) {
      result = result.filter(property => property.bedrooms >= parseInt(filters.minBedrooms));
    }
    
    // Apply maximum price filter
    if (filters.maxPrice) {
      result = result.filter(property => property.rentAmount <= parseInt(filters.maxPrice));
    }
    
    setFilteredProperties(result);
  }, [searchTerm, filters, properties]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      propertyType: '',
      minBedrooms: '',
      maxPrice: '',
    });
    setSearchTerm('');
  };

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/tenant-dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Available Properties</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="page-hero">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Tenant Search
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Available Properties</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">Browse all available properties for rent.</p>
          </div>
        </div>
      </section>

      <Card className="data-surface border-none shadow-none">
        <CardHeader>
          <CardTitle>Property catalogue</CardTitle>
          <CardDescription>Filter by type, bedroom count, or rent budget to narrow the search.</CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyFilters 
            searchTerm={searchTerm}
            filters={filters}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            onFilterChange={handleFilterChange}
            onResetFilters={resetFilters}
          />

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
              <div className="animate-pulse">Loading properties...</div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <PropertyEmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  formatCurrency={formatCurrency}
                  onClick={() => setSelectedProperty(property)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
};

export default AvailableProperties;
