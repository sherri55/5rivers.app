import{c as t}from"./index-Cba2CGbx.js";import{g as e}from"./dateUtils-DEm9xBK4.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a=t("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n=t("SlidersHorizontal",[["line",{x1:"21",x2:"14",y1:"4",y2:"4",key:"obuewd"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4",key:"1q6298"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12",key:"1iu8h1"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12",key:"ntss68"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20",key:"14d8ph"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20",key:"m0wm8r"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6",key:"14e1ph"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14",key:"1i6ji0"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22",key:"1lctlv"}]]),o=e`
  query GetDrivers($pagination: PaginationInput) {
    drivers(pagination: $pagination) {
      id
      name
      description
      email
      phone
      hourlyRate
      createdAt
      updatedAt
    }
  }
`,d=e`
  query GetDriver($id: ID!) {
    driver(id: $id) {
      id
      name
      description
      email
      phone
      hourlyRate
      createdAt
      updatedAt
      jobs {
        id
        jobDate
        calculatedAmount
        calculatedHours
      }
      driverRates {
        id
        hourlyRate
        percentageRate
        jobType {
          id
          title
        }
      }
    }
  }
`,y=e`
  mutation CreateDriver($input: CreateDriverInput!) {
    createDriver(input: $input) {
      id
      name
      description
      email
      phone
      hourlyRate
      createdAt
      updatedAt
    }
  }
`,p=e`
  mutation UpdateDriver($input: UpdateDriverInput!) {
    updateDriver(input: $input) {
      id
      name
      description
      email
      phone
      hourlyRate
      createdAt
      updatedAt
    }
  }
`;e`
  mutation DeleteDriver($id: ID!) {
    deleteDriver(id: $id)
  }
`;export{y as C,a as F,d as G,n as S,p as U,o as a};
