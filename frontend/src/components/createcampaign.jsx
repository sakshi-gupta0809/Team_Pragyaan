import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Dummy parser (replace with PapaParse or SheetJS)
const parseCSV = (file, setContacts) => {
  const dummyData = [
    { firstName: "John", company: "Acme Corp", email: "john@acme.com" },
    { firstName: "Sarah", company: "Beta Inc", email: "sarah@beta.com" },
  ];
  setTimeout(() => setContacts(dummyData), 1000);
};

export default function CampaignCreateModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [campaignType, setCampaignType] = useState("cold_outreach");
  const [contacts, setContacts] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) parseCSV(file, setContacts);
  };

  const handleSaveCampaign = () => {
    const campaign = {
      id: Date.now(),
      name: campaignName,
      description: campaignDesc,
      type: campaignType,
      contacts,
    };
    onSave(campaign); // send back to Dashboard
    onClose(); // close modal
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <Card className="w-[600px] p-6">
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Campaign Name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
                <Input
                  placeholder="Campaign Description"
                  value={campaignDesc}
                  onChange={(e) => setCampaignDesc(e.target.value)}
                />
                <div className="space-y-1">
                  <Label htmlFor="campaign-type">Campaign Type</Label>
                  <Select
                    value={campaignType}
                    onValueChange={setCampaignType}
                  >
                    <SelectTrigger id="campaign-type">
                      <SelectValue placeholder="Select campaign type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                      <SelectItem value="conference">In Person Meet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!campaignName}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Tabs defaultValue="upload">
                <TabsList>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                </TabsList>

                <TabsContent value="upload">
                  <Input
                    type="file"
                    accept=".csv, .xlsx"
                    onChange={handleFileUpload}
                  />
                </TabsContent>

                <TabsContent value="manual">
                  <div className="space-y-2">
                    <Input placeholder="First Name" />
                    <Input placeholder="Company" />
                    <Input placeholder="Email" />
                    <Button
                      onClick={() =>
                        setContacts([
                          ...contacts,
                          {
                            firstName: "Manual User",
                            company: "Manual Co",
                            email: "manual@co.com",
                          },
                        ])
                      }
                    >
                      Add Contact
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {contacts.length > 0 && (
                <div className="mt-4 border rounded p-3">
                  <h3 className="font-semibold mb-2">Imported Contacts</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left">Name</th>
                        <th className="text-left">Company</th>
                        <th className="text-left">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c, idx) => (
                        <tr key={idx} className="border-b">
                          <td>{c.firstName}</td>
                          <td>{c.company}</td>
                          <td>{c.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleSaveCampaign}
                  disabled={contacts.length === 0}
                >
                  Save Campaign
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
