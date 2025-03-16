
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
    // Simulate API call to fetch properties
    setTimeout(() => {
      const mockProperties: Property[] = [
        {
          id: 'prop1',
          name: 'Luxury Apartment in Kololo',
          address: '15 Acacia Avenue, Kololo, Kampala',
          type: 'Apartment',
          bedrooms: 2,
          bathrooms: 2,
          area: 120,
          rentAmount: 1200000,
          images: [
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGhvdXNlfGVufDB8fDB8fHww',
            'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8aG91c2UlMjBpbnRlcmlvcnxlbnwwfHwwfHx8MA%3D%3D',
            'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fGhvdXNlJTIwaW50ZXJpb3J8ZW58MHx8MHx8fDA%3D'
          ],
          amenities: ['Gym', 'Swimming Pool', 'Security', 'Parking', 'Balcony'],
          status: 'available',
          landlord: 'John Doe'
        },
        {
          id: 'prop2',
          name: 'Garden View Villa in Muyenga',
          address: '78 Tank Hill Road, Muyenga, Kampala',
          type: 'House',
          bedrooms: 4,
          bathrooms: 3,
          area: 250,
          rentAmount: 2500000,
          images: [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8aG91c2V8ZW58MHx8MHx8fDA%3D',
            'https://images.unsplash.com/photo-1589834390005-5d4fb9bf3d32?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGhvdXNlJTIwaW50ZXJpb3J8ZW58MHx8MHx8fDA%3D',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fGhvdXNlJTIwaW50ZXJpb3J8ZW58MHx8MHx8fDA%3D'
          ],
          amenities: ['Garden', 'Security', 'Parking', 'Servants Quarter', 'Water Tank'],
          status: 'available',
          landlord: 'Sarah Smith'
        },
        {
          id: 'prop3',
          name: 'Modern Apartment in Bugolobi',
          address: '45 Luthuli Avenue, Bugolobi, Kampala',
          type: 'Apartment',
          bedrooms: 3,
          bathrooms: 2,
          area: 160,
          rentAmount: 1800000,
          images: [
            'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YXBhcnRtZW50fGVufDB8fDB8fHww',
            'https://images.unsplash.com/photo-1588854337116-d1feb5189d54?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8YXBhcnRtZW50fGVufDB8fDB8fHww',
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGFwYXJ0bWVudHxlbnwwfHwwfHx8MA%3D%3D'
          ],
          amenities: ['Security', 'Parking', 'Internet', 'Water Tank', 'Generator'],
          status: 'available',
          landlord: 'Michael Johnson'
        },
        {
          id: 'prop4',
          name: 'Cozy Studio in Ntinda',
          address: '12 Ntinda Road, Ntinda, Kampala',
          type: 'Studio',
          bedrooms: 1,
          bathrooms: 1,
          area: 75,
          rentAmount: 800000,
          images: [
            'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFwYXJ0bWVudHxlbnwwfHwwfHx8MA%3D%3D',
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YXBhcnRtZW50fGVufDB8fDB8fHww',
            'https://images.unsplash.com/photo-1489171078254-c3365d6e359f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fGFwYXJ0bWVudHxlbnwwfHwwfHx8MA%3D%3D'
          ],
          amenities: ['Security', 'Parking', 'Furnished', 'Internet'],
          status: 'available',
          landlord: 'Emma Davis'
        },
      ];
      
      setProperties(mockProperties);
      setFilteredProperties(mockProperties);
      setIsLoading(false);
    }, 1000);
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
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Available Properties</h1>
          <p className="text-muted-foreground">Browse all available properties for rent</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <PropertyFilters 
            searchTerm={searchTerm}
            filters={filters}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            onFilterChange={handleFilterChange}
            onResetFilters={resetFilters}
          />

          {isLoading ? (
            <div className="py-8 text-center">
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
