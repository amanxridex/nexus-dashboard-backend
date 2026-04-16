const { hostDb } = require('../config/supabase');
const crypto = require('crypto');

exports.getSponsoredHomes = async (req, res) => {
    try {
        const { data, error } = await hostDb
            .from('sponsored_homes')
            .select('*')
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Error fetching sponsored homes:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.uploadSponsoredHome = async (req, res) => {
    try {
        const { companyName, priceStr, aboutText, externalLink, imageBase64 } = req.body;

        if (!companyName || !priceStr || !externalLink || !imageBase64) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        let imageUrl = '';
        
        // Handle Base64 Upload
        if (imageBase64.startsWith('data:image/')) {
            const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                return res.status(400).json({ success: false, message: "Invalid base64 string" });
            }
            
            const buffer = Buffer.from(matches[2], 'base64');
            const fileExt = matches[1].split('/')[1];
            const fileName = `sponsored_${Date.now()}_${crypto.randomUUID().substring(0,6)}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await hostDb.storage
                .from('sponsored-homes')
                .upload(fileName, buffer, {
                    contentType: matches[1],
                    upsert: false
                });

            if (uploadError) {
                return res.status(400).json({ success: false, message: uploadError.message });
            }

            const { data: { publicUrl } } = hostDb.storage
                .from('sponsored-homes')
                .getPublicUrl(fileName);
                
            imageUrl = publicUrl;
        } else {
            imageUrl = imageBase64; // Fallback if using direct URL
        }

        const { data, error } = await hostDb
            .from('sponsored_homes')
            .insert([{
                company_name: companyName,
                price_str: priceStr,
                about_text: aboutText,
                external_link: externalLink,
                image_url: imageUrl
            }])
            .select();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(201).json({ success: true, data: data[0], message: "Sponsored home added successfully." });
    } catch (err) {
        console.error("Error uploading sponsored home:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.updateSponsoredHome = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, display_order } = req.body;

        const { data, error } = await hostDb
            .from('sponsored_homes')
            .update({ is_active, display_order })
            .eq('id', id)
            .select();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(200).json({ success: true, data: data[0], message: "Sponsored home updated successfully." });
    } catch (err) {
        console.error("Error updating sponsored home:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.deleteSponsoredHome = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await hostDb
            .from('sponsored_homes')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        if (data && data.length > 0 && data[0].image_url) {
            // Optional: Delete from storage bucket if you'd like
            const url = data[0].image_url;
            const parts = url.split('/');
            const fileName = parts[parts.length - 1];
            await hostDb.storage.from('sponsored-homes').remove([fileName]);
        }

        res.status(200).json({ success: true, message: "Sponsored home deleted successfully." });
    } catch (err) {
        console.error("Error deleting sponsored home:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
