-- Admin policies for CRUD operations on all tables
-- For now, we allow public access for demo purposes
-- In production, you should add proper authentication with admin roles

-- Crops - Allow CRUD
CREATE POLICY "Allow insert for crops" ON public.crops FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for crops" ON public.crops FOR UPDATE USING (true);
CREATE POLICY "Allow delete for crops" ON public.crops FOR DELETE USING (true);

-- Diseases - Allow CRUD  
CREATE POLICY "Allow insert for diseases" ON public.diseases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for diseases" ON public.diseases FOR UPDATE USING (true);
CREATE POLICY "Allow delete for diseases" ON public.diseases FOR DELETE USING (true);

-- Treatments - Allow CRUD
CREATE POLICY "Allow insert for treatments" ON public.treatments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for treatments" ON public.treatments FOR UPDATE USING (true);
CREATE POLICY "Allow delete for treatments" ON public.treatments FOR DELETE USING (true);

-- Agricultural Alerts - Allow CRUD
CREATE POLICY "Allow insert for alerts" ON public.agricultural_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for alerts" ON public.agricultural_alerts FOR UPDATE USING (true);
CREATE POLICY "Allow delete for alerts" ON public.agricultural_alerts FOR DELETE USING (true);

-- Farming Tips - Allow CRUD
CREATE POLICY "Allow insert for tips" ON public.farming_tips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for tips" ON public.farming_tips FOR UPDATE USING (true);
CREATE POLICY "Allow delete for tips" ON public.farming_tips FOR DELETE USING (true);

-- Market Prices - Allow CRUD
CREATE POLICY "Allow insert for market_prices" ON public.market_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for market_prices" ON public.market_prices FOR UPDATE USING (true);
CREATE POLICY "Allow delete for market_prices" ON public.market_prices FOR DELETE USING (true);

-- Chat History - Allow delete for cleanup
CREATE POLICY "Allow delete for chat_history" ON public.chat_history FOR DELETE USING (true);