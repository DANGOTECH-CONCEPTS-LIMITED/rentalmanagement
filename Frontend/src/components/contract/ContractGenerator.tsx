
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FilePlus, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ContractGeneratorProps {
  onClose: () => void;
}

const ContractGenerator = ({ onClose }: ContractGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [contractGenerated, setContractGenerated] = useState(false);
  const { toast } = useToast();

  const generateContract = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Input required",
        description: "Please provide details about the contract terms and conditions.",
      });
      return;
    }

    setIsGenerating(true);

    // Simulate AI contract generation with a setTimeout
    setTimeout(() => {
      setIsGenerating(false);
      setContractGenerated(true);
      toast({
        title: "Contract Generated Successfully",
        description: "Your contract is ready to download.",
      });
    }, 3000);
  };

  const downloadContract = () => {
    try {
      // Create a dummy text content for the PDF
      const dummyText = `RENTAL AGREEMENT
    
THIS RENTAL AGREEMENT ("Agreement") is made and entered into this ${new Date().toLocaleDateString()}, by and between Property Owner ("Landlord") and Tenant.

PROPERTY: ${prompt.substring(0, 100)}...

TERM: This Agreement shall commence on ${new Date().toLocaleDateString()} and continue as a lease for term.

RENT: Tenant shall pay to Landlord as rent for the Property the amount of $1,200 per month.

UTILITIES: Tenant shall be responsible for the payment of all utilities and services to the Property.

MAINTENANCE: Tenant shall maintain the Property in a clean and sanitary condition.

---Generated by AI based on your requirements---`;

      // Create a Blob with the text content
      const blob = new Blob([dummyText], { type: 'text/plain' });
      
      // Create a download link and trigger the download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rental_contract_${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);

      toast({
        title: "Contract Downloaded",
        description: "Contract has been downloaded to your device.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "There was an error downloading the contract. Please try again.",
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FilePlus className="h-5 w-5" />
          AI Contract Generator
        </CardTitle>
        <CardDescription>
          Describe your contract requirements and our AI will generate a professional rental agreement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!contractGenerated ? (
          <>
            <div className="space-y-2">
              <label htmlFor="contractPrompt" className="text-sm font-medium">
                Describe your rental terms and conditions
              </label>
              <Textarea
                id="contractPrompt"
                placeholder="Example: This is a 12-month lease agreement for a 2-bedroom apartment at 123 Main Street. The monthly rent is $1,200 with a security deposit of $1,200. Utilities are not included. No pets allowed. Rent is due on the 1st of each month..."
                rows={8}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="resize-none"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Tips for effective contract generation:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Include property details (address, type, features)</li>
                <li>Specify rent amount and payment terms</li>
                <li>Define lease duration and start date</li>
                <li>Mention security deposit requirements</li>
                <li>Outline utility responsibilities</li>
                <li>State policies on pets, smoking, etc.</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto bg-green-100 text-green-700 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
              <FilePlus className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold">Contract Ready!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your rental agreement has been generated based on your specifications. You can download it as a text file.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t p-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {!contractGenerated ? (
          <Button onClick={generateContract} disabled={isGenerating || !prompt.trim()}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Contract'
            )}
          </Button>
        ) : (
          <Button onClick={downloadContract} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Contract
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ContractGenerator;
