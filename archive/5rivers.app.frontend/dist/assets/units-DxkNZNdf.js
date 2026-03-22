import{g as t}from"./dateUtils-DEm9xBK4.js";const e=t`
  query GetUnits($pagination: PaginationInput) {
    units(pagination: $pagination) {
      id
      name
      description
      color
      plateNumber
      vin
      createdAt
      updatedAt
    }
  }
`,n=t`
  query GetUnit($id: ID!) {
    unit(id: $id) {
      id
      name
      description
      color
      plateNumber
      vin
      createdAt
      updatedAt
      jobs {
        id
        jobDate
        calculatedAmount
        driver {
          id
          name
        }
      }
    }
  }
`,a=t`
  mutation CreateUnit($input: CreateUnitInput!) {
    createUnit(input: $input) {
      id
      name
      description
      color
      plateNumber
      vin
      createdAt
      updatedAt
    }
  }
`,d=t`
  mutation UpdateUnit($input: UpdateUnitInput!) {
    updateUnit(input: $input) {
      id
      name
      description
      color
      plateNumber
      vin
      createdAt
      updatedAt
    }
  }
`;t`
  mutation DeleteUnit($id: ID!) {
    deleteUnit(id: $id)
  }
`;export{a as C,n as G,d as U,e as a};
