import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { House, Search, Eye, Edit, Trash, XIcon } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  units: number;
  landlordName: string;
  landlordId: string;
  images: string[];
}

const LandlordProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    // Simulate API call to fetch properties
    setTimeout(() => {
      const mockProperties: Property[] = [
        {
          id: 'prop1',
          name: 'Sunset Apartments',
          address: '123 Main St, Kampala, Uganda',
          type: 'Apartment',
          units: 8,
          landlordName: 'John Doe',
          landlordId: 'land1',
          images: [
            'https://images.unsplash.com/photo-1460317442991-0ec209397118',
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'
          ]
        },
        {
          id: 'prop2',
          name: 'Bayview Condos',
          address: '456 Park Ave, Entebbe, Uganda',
          type: 'Condominium',
          units: 12,
          landlordName: 'Sarah Smith',
          landlordId: 'land2',
          images: [
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'
          ]
        },
        {
          id: 'prop3',
          name: 'Green Gardens Villa',
          address: '789 Garden Rd, Jinja, Uganda',
          type: 'House',
          units: 1,
          landlordName: 'Michael Johnson',
          landlordId: 'land3',
          images: [
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750'
          ]
        },
        {
          id: 'prop4',
          name: 'Downtown Office',
          address: '101 Business Blvd, Kampala, Uganda',
          type: 'Commercial',
          units: 5,
          landlordName: 'John Doe',
          landlordId: 'land1',
          images: [
            'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
            'https://images.unsplash.com/photo-1497366811353-6870744d04b2'
          ]
        },
      ];

      setProperties(mockProperties);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.landlordName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-0">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Landlord Properties</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View and manage all properties registered in the system</p>
        </div>
        <Button onClick={() => window.location.href = '/admin-dashboard/register-property'} className="w-full sm:w-auto">
          Add New Property
        </Button>
      </div>



      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by property name, address, or landlord..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-pulse">Loading properties...</div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <House className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No properties found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm ? 'Try adjusting your search query' : 'Start by adding a new property'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property Name</TableHead>
                    <TableHead className="hidden md:table-cell">Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Units</TableHead>
                    <TableHead>Landlord</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{property.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{property.address}</TableCell>
                      <TableCell>{property.type}</TableCell>
                      <TableCell className="hidden md:table-cell">{property.units}</TableCell>
                      <TableCell>{property.landlordName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedProperty(property)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="text-red-500">
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-full sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">{selectedProperty.name}</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedProperty(null)}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm sm:text-base font-medium text-gray-500">Property Details</h3>
                    <p className="mt-1"><span className="font-medium">Address:</span> {selectedProperty.address}</p>
                    <p className="mt-1"><span className="font-medium">Type:</span> {selectedProperty.type}</p>
                    <p className="mt-1"><span className="font-medium">Units:</span> {selectedProperty.units}</p>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-medium text-gray-500">Landlord Information</h3>
                    <p className="mt-1"><span className="font-medium">Name:</span> {selectedProperty.landlordName}</p>
                    <p className="mt-1"><span className="font-medium">ID:</span> {selectedProperty.landlordId}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-medium text-gray-500 mb-2">Property Images</h3>
                  <div className="grid grid-cols sm:grid-cols-2 gap-2">
                    {selectedProperty.images.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`${selectedProperty.name} ${index + 1}`}
                        className="rounded-md w-full h-32 sm:h-40 md:h-48 md:w-48 object-cover"
                      />
                    ))}
                  </div>
                </div>

              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end mt-6 space-y-2 sm:space-x-2 sm:space-y-0">
                <Button variant="outline" onClick={() => setSelectedProperty(null)} className="w-full sm:w-auto">
                  Close
                </Button>
                <Button className="w-full sm:w-auto">Edit Property</Button>
              </div>

            </div>
          </div>
        </div>

      )}
    </div>
  );
};

export default LandlordProperties;
