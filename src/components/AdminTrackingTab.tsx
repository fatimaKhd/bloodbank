import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import BloodMap from "./BloodMap"; // import at the top

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Droplet, Hospital, MapPin } from "lucide-react";
import { toast } from "sonner";

export const AdminTrackingTab = () => {
    const [trackingData, setTrackingData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTracking, setSelectedTracking] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchTracking = async () => {
            try {
                const token = localStorage.getItem("authToken");

                const res = await fetch("http://localhost:5000/api/tracking/logs", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }); const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to fetch tracking logs");
                setTrackingData(data);
            } catch (err) {
                console.error("Tracking fetch error", err);
                toast.error("Failed to load tracking data");
            } finally {
                setLoading(false);
            }
        };

        fetchTracking();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Blood Unit Tracking</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : trackingData.length === 0 ? (
                    <p className="text-gray-500">No tracking data available</p>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Unit ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>Units</TableHead>
                                    <TableHead>Expected Arrival</TableHead>
                                    <TableHead>Track</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {trackingData.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium flex items-center space-x-2">
                                            <Droplet className="h-4 w-4 text-red-500" />
                                            <span>{item.blood_unit_id}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {item.status.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{item.from_location || "Unknown"}</TableCell>
                                        <TableCell>{item.location || "Unknown"}</TableCell>
                                        <TableCell>{item.units_dispatched || 0}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {item.expected_arrival
                                                ? new Date(item.expected_arrival).toLocaleString()
                                                : "Unknown"}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedTracking(item);
                                                    setShowModal(true);
                                                }}
                                            >
                                                Track
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Modal Dialog for Tracking Details */}
                        {selectedTracking && (
                            <Dialog open={showModal} onOpenChange={setShowModal}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Tracking Blood Unit #{selectedTracking.blood_unit_id}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <MapPin className="h-5 w-5 text-blue-500" />
                                            <span>
                                                <strong>Status:</strong> {selectedTracking.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <p>
                                            <strong>From:</strong> {selectedTracking.from_location}
                                        </p>
                                        <p>
                                            <strong>To:</strong> {selectedTracking.location}
                                        </p>
                                        <p>
                                            <strong>Units Dispatched:</strong> {selectedTracking.units_dispatched}
                                        </p>
                                        <p>
                                            <strong>Expected Arrival:</strong>{" "}
                                            {selectedTracking.expected_arrival
                                                ? new Date(selectedTracking.expected_arrival).toLocaleString()
                                                : "Unknown"}
                                        </p>

                                        <BloodMap
                                            from={selectedTracking.from_location}
                                            to={selectedTracking.location}
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};
