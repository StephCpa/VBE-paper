import { ACTION_CONFIDENCE_COSTS, ACTION_CONFIDENCE_DISTRIBUTIONS, ACTION_MASKS, interfaceOrder, maskOrder, parseScalarConfidence, parseVectorConfidence, scalarCostOrder, scalarPrompt, sha256ActionConfidence, vectorPrompt, type ActionConfidenceBlock, type ActionConfidenceItem } from "./founder-action-confidence.ts";
import { grokChat } from "./llm.ts";

export async function runActionConfidenceBlock(block: number): Promise<ActionConfidenceBlock> {
  const distribution = [...ACTION_CONFIDENCE_DISTRIBUTIONS[block - 1]!];
  let calls = 0, apiFails = 0, parseFails = 0, position = 0;
  const items: ActionConfidenceItem[] = [];
  const order = interfaceOrder(block);
  for (let interfacePosition = 0; interfacePosition < order.length; interfacePosition++) {
    const kind = order[interfacePosition]!;
    const masks = maskOrder(block, interfacePosition);
    for (let maskPosition = 0; maskPosition < masks.length; maskPosition++) {
      const mask = masks[maskPosition]!;
      if (kind === "compiled-scalar") {
        for (const cost of scalarCostOrder(block, maskPosition)) {
          const prompt = scalarPrompt(distribution, mask, cost); calls += 1; position += 1;
          const response = await grokChat({ prompt, system: "Map the verified event probability to the already sealed chosen action. Return only the requested JSON object.", maxTokens: 64, temperature: 0, json: true });
          if (!response.ok) { apiFails += 1; throw new Error(`action-confidence scalar block=${block} mask=${mask} cost=${cost}: ${response.error}`); }
          let prediction: number;
          try { prediction = parseScalarConfidence(response.text); } catch (error) { parseFails += 1; throw new Error(`action-confidence scalar block=${block} mask=${mask} cost=${cost}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
          items.push({ block, distribution, mask, interface: kind, cost, position, promptHash: sha256ActionConfidence(prompt), prediction });
        }
      } else {
        const prompt = vectorPrompt(kind, distribution, mask); calls += 1; position += 1;
        const response = await grokChat({ prompt, system: "Report confidence in each already sealed chosen action. Return exactly one JSON object with one key named confidences whose value is an array of exactly three numbers ordered for cost 1, cost 3, cost 5.", maxTokens: 128, temperature: 0, json: true });
        if (!response.ok) { apiFails += 1; throw new Error(`action-confidence vector block=${block} interface=${kind} mask=${mask}: ${response.error}`); }
        let prediction;
        try { prediction = parseVectorConfidence(response.text); } catch (error) { parseFails += 1; throw new Error(`action-confidence vector block=${block} interface=${kind} mask=${mask}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
        items.push({ block, distribution, mask, interface: kind, cost: null, position, promptHash: sha256ActionConfidence(prompt), prediction });
      }
    }
    console.log(`  action-confidence block=${block} interface=${kind} calls=${calls}`);
  }
  if (calls !== 48 || items.length !== 48) throw new Error(`action-confidence incomplete block=${block} calls=${calls} items=${items.length}`);
  return { block, calls, apiFails, parseFails, items };
}
