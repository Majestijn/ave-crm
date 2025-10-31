export type User = {
  uid?: string;
  name: string;
  email: string;
  role: string;
};

export type Paginated<T> = {
  data: T[];
  links: {
    first: string;
    last: string;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
  };
};
