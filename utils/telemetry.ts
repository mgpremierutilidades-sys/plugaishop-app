type Payload = Record<string, unknown>;

export function track(event: string, payload?: Payload): void {
  // noop por padrão: plug real pode ser adicionado depois
  // Mantém compatibilidade e não quebra runtime.
  void event;
  void payload;
}
