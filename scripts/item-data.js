export class RoleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      die:         new StringField({ initial: "d6", choices: ["d4", "d6", "d8", "d10"] }),
      description: new StringField({ initial: "" }),
    };
  }
}

export class AspectData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      description: new StringField({ initial: "" }),
    };
  }
}

export class ClassData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      die:         new StringField({ initial: "d6", choices: ["d4", "d6", "d8", "d10"] }),
      description: new StringField({ initial: "" }),
    };
  }
}

export class EdgeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      description: new StringField({ initial: "" }),
    };
  }
}

export class CampaignActionData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      description: new StringField({ initial: "" }),
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
