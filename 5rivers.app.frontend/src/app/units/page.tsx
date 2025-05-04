"use client";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { UnitList } from "../../components/units/UnitList";
import { UnitForm } from "../../components/units/UnitForm";
import { UnitDetails } from "../../components/units/UnitDetails";
import { Plus } from "lucide-react";

export default function UnitsPage() {
  const [tab, setTab] = useState("list");
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const handleSelect = (unit) => {
    setSelected(unit);
    setTab("details");
  };
  const handleEdit = (unit) => {
    setEdit(unit);
    setTab("create");
  };
  const handleSuccess = () => {
    setEdit(null);
    setTab("list");
    setRefresh((r) => r + 1);
  };
  const handleCancel = () => {
    setEdit(null);
    setTab("list");
  };

  return (
    <section className="max-w-5xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="gap-2 mb-6">
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="create" onClick={() => setEdit(null)}>
                <Plus className="w-4 h-4 mr-1" /> Create
              </TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <UnitList
                onSelect={handleSelect}
                onEdit={handleEdit}
                refresh={refresh}
              />
            </TabsContent>
            <TabsContent value="create">
              <UnitForm
                unit={edit}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </TabsContent>
            <TabsContent value="details">
              <UnitDetails unit={selected} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
