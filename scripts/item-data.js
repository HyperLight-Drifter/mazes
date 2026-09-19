import { plainTextToHtml } from "./actor-data.js";

class DescriptionData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (typeof source.description === "string") source.description = plainTextToHtml(source.description);
    return super.migrateData(source);
  }
}

export class RoleData extends DescriptionData {
  static defineSchema() {
    const { StringField, HTMLField } = foundry.data.fields;
    return {
      die:         new StringField({ initial: "d6", choices: ["d4", "d6", "d8", "d10"] }),
      description: new HTMLField({ required: false, blank: true, initial: "" }),
    };
  }
}

export class AspectData extends DescriptionData {
  static defineSchema() {
    const { StringField, HTMLField } = foundry.data.fields;
    return {
      description: new HTMLField({ required: false, blank: true, initial: "" }),
    };
  }
}

export class ClassData extends DescriptionData {
  static defineSchema() {
    const { StringField, HTMLField } = foundry.data.fields;
    return {
      die:         new StringField({ initial: "d6", choices: ["d4", "d6", "d8", "d10"] }),
      description: new HTMLField({ required: false, blank: true, initial: "" }),
    };
  }
}

export class EdgeData extends DescriptionData {
  static defineSchema() {
    const { StringField, HTMLField } = foundry.data.fields;
    return {
      description: new HTMLField({ required: false, blank: true, initial: "" }),
    };
  }
}

export class CampaignActionData extends DescriptionData {
  static defineSchema() {
    const { StringField, HTMLField } = foundry.data.fields;
    return {
      description: new HTMLField({ required: false, blank: true, initial: "" }),
      slot:        new StringField({ initial: "hexcrawl", choices: ["hexcrawl", "downtime"] }),
    };
  }
}

export const itemDataModels = {
  role:   RoleData,
  aspect: AspectData,
  class:  ClassData,
  edge:   EdgeData,
  campaignAction: CampaignActionData,
};
