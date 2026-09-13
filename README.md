# Gravador IA

App em Expo/React Native para gravar notas de voz e, opcionalmente, transcrever o áudio e gerar um resumo usando IA. Você escolhe qual provedor de IA usar para cada etapa.

## Funcionalidades

- Gravação de áudio (pausar, retomar, descartar, salvar) com `expo-audio`.
- Lista de gravações com reprodução, avanço/retrocesso de 10s e renomeação.
- Transcrição de áudio via **Groq** (Whisper) ou **OpenAI** (Whisper / gpt-4o-transcribe).
- Resumo do texto transcrito via **Groq**, **OpenAI**, **Anthropic** ou **OpenRouter**.
- Configuração de chave de API e modelo por provedor, guardada com segurança no dispositivo (`expo-secure-store`).

> Anthropic e OpenRouter não expõem uma API de transcrição de áudio própria, por isso só aparecem como opção para a etapa de resumo.

## Como rodar

```bash
npm install
npx expo start
```

Abra no Expo Go, num emulador Android/iOS ou num development build. A gravação de áudio depende de módulos nativos (`expo-audio`), então **funciona no dispositivo/emulador, mas não no navegador**.

## Configurando as chaves de API

Dentro do app, vá em **Ajustes** e cole a chave de cada provedor que quiser usar:

| Provedor   | Onde gerar a chave                                   |
| ---------- | ----------------------------------------------------- |
| Groq       | console.groq.com/keys                                 |
| OpenAI     | platform.openai.com/api-keys                          |
| Anthropic  | console.anthropic.com/settings/keys                   |
| OpenRouter | openrouter.ai/keys                                     |

As chaves ficam salvas apenas no dispositivo (Keychain/Keystore via `expo-secure-store`) e nunca são enviadas para nenhum servidor além da API do provedor escolhido.

Os campos de "modelo" em cada provedor já vêm com um valor padrão sensato (ex.: `whisper-large-v3-turbo` na Groq), mas podem ser trocados por qualquer modelo suportado pela API daquele provedor.

## Estrutura do projeto

```
src/
  app/                 rotas (expo-router)
    (tabs)/            abas: Gravações, Gravar, Ajustes
    recording/[id].tsx  detalhe de uma gravação
  components/          componentes de UI reutilizáveis
  hooks/               useRecorder (gravação) e usePlayback (reprodução)
  lib/
    providers/         chamadas às APIs de transcrição e resumo
    storage/           persistência (AsyncStorage + SecureStore)
    audio/             gestão dos arquivos de áudio no dispositivo
  store/               estado global (Zustand)
```

## Aviso de custo

Transcrição e resumo consomem créditos/uso pago das APIs configuradas. O app não impõe limites — fique de olho no uso em cada provedor.
