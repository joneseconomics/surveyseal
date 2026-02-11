"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
] as const;

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",
  KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
  MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",
  MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
  OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
  DC:"District of Columbia",
};

export function JudgeDemographicsForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [hiringExp, setHiringExp] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={action}
      onSubmit={() => setSubmitting(true)}
      className="space-y-4"
    >
      <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
        <p className="text-sm font-medium text-foreground">
          Before you begin, please tell us a little about yourself.
        </p>

        {/* Job Title */}
        <div className="space-y-1.5">
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input
            id="jobTitle"
            name="jobTitle"
            required
            placeholder="e.g. Software Engineer"
          />
        </div>

        {/* Employer */}
        <div className="space-y-1.5">
          <Label htmlFor="employer">Current Employer</Label>
          <Input
            id="employer"
            name="employer"
            required
            placeholder="e.g. Acme Corp"
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            required
            placeholder="e.g. Austin"
          />
        </div>

        {/* State */}
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Select name="state" required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((abbr) => (
                <SelectItem key={abbr} value={abbr}>
                  {STATE_NAMES[abbr]} ({abbr})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Hiring Experience */}
        <div className="space-y-2">
          <Label>
            Have you ever been responsible for hiring a job candidate?
          </Label>
          <RadioGroup
            name="hasHiringExperience"
            required
            value={hiringExp}
            onValueChange={setHiringExp}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id="hiring-yes" />
              <Label htmlFor="hiring-yes" className="font-normal">
                Yes
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id="hiring-no" />
              <Label htmlFor="hiring-no" className="font-normal">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Hiring Roles (conditional) */}
        {hiringExp === "yes" && (
          <div className="space-y-2 pl-2">
            <Label>In what capacity? (select all that apply)</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="role-supervisor"
                name="hiringRoles"
                value="directSupervisor"
              />
              <Label htmlFor="role-supervisor" className="font-normal">
                Direct supervisor of the position
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="role-committee"
                name="hiringRoles"
                value="hiringCommittee"
              />
              <Label htmlFor="role-committee" className="font-normal">
                Served on a hiring committee
              </Label>
            </div>
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Continuing..." : "Continue to Survey"}
      </Button>
    </form>
  );
}
