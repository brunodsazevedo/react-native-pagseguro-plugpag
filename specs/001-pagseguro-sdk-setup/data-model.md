# Data Model: PagSeguro SDK Setup & iOS Removal

**Feature**: 001-pagseguro-sdk-setup
**Date**: 2026-03-21

---

Esta feature é de natureza puramente infraestrutural — configura dependências de build e impõe restrição de plataforma. Não introduz entidades de dados, modelos de persistência, estado de aplicação, ou estruturas de resposta novas.

## Configuração do Expo Config Plugin

O único "dado" gerenciado pela feature é a **configuração injetada** nos arquivos de build Android. Não é um modelo de dados em runtime, mas é documentado aqui por completude.

### Entradas injetadas em `settings.gradle` (Expo Prebuild)

```
Bloco: dependencyResolutionManagement.repositories
Entrada: maven { url "https://github.com/pagseguro/PlugPagServiceWrapper/raw/master" }
Identificador de idempotência: tag "pagseguro-plugpag-maven"
```

### Entradas injetadas em `android/app/build.gradle` (Expo Prebuild)

```
Bloco: dependencies
Entrada: implementation 'br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0'
Identificador de idempotência: tag "pagseguro-plugpag-dependency"
```

### Entradas em `android/build.gradle` da lib (standalone, sem Expo)

```
Bloco: buildscript.repositories
Entrada: maven { url 'https://github.com/pagseguro/PlugPagServiceWrapper/raw/master' }

Bloco: dependencies
Entrada: implementation 'br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0'
```

---

> Nenhum modelo de dados adicional é necessário para esta feature. Modelos de domínio (resultado de transações, dados de pagamento, etc.) serão introduzidos nas fases subsequentes de implementação do SDK.
